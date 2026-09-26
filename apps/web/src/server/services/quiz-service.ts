import 'server-only';
import {
  PRICE_OPTIONS,
  type Answers,
  type FlowStep,
  type Progress,
  type QuizEngine,
} from '@relacionamentos/quiz-engine';
import type { QuizSession } from '@relacionamentos/db';
import { z } from 'zod';
import type { ProgressDTO, QuizStateDTO, StepDTO } from '@/lib/dto';
import { extractHighlights } from '@/lib/markdown';
import { trackEvent } from '../analytics';
import { db } from '../db';
import { HttpError } from '../http';
import { generateToken, hashToken, isValidTokenFormat } from '../security/tokens';

const storedAnswersSchema = z.record(z.string().max(120), z.array(z.string().max(120)).max(50));

export function parseAnswers(json: string | null | undefined): Answers {
  if (!json) return {};
  try {
    const parsed = storedAnswersSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export async function createQuizSession(): Promise<{ session: QuizSession; token: string }> {
  const token = generateToken();
  const session = await db().quizSession.create({
    data: { accessTokens: { create: { tokenHash: hashToken(token), source: 'quiz' } } },
  });
  return { session, token };
}

export type AccessScope = 'owner' | 'viewer';

/**
 * Localiza a sessão pelo token (cookie ou link) e informa o escopo do acesso:
 * - `owner`: quem fez o teste (cookie, link do resultado, link de recuperação);
 * - `viewer`: link de compartilhamento — somente leitura.
 * Tokens revogados ou malformados são ignorados.
 */
export async function findSessionAccess(
  token: string | null | undefined,
): Promise<{ session: QuizSession; scope: AccessScope } | null> {
  if (!isValidTokenFormat(token)) return null;
  const access = await db().sessionAccessToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { session: true },
  });
  if (!access || access.revokedAt) return null;
  if (!access.lastUsedAt || Date.now() - access.lastUsedAt.getTime() > 60_000) {
    await db().sessionAccessToken.update({ where: { id: access.id }, data: { lastUsedAt: new Date() } });
  }
  return { session: access.session, scope: access.scope === 'viewer' ? 'viewer' : 'owner' };
}

/** Sessão acessível pelo token com permissão de DONO (responder, e-mail, compartilhar, excluir). */
export async function findSessionByToken(token: string | null | undefined): Promise<QuizSession | null> {
  const access = await findSessionAccess(token);
  return access && access.scope === 'owner' ? access.session : null;
}

function toProgressDTO(progress: Progress): ProgressDTO {
  return {
    percent: progress.percent,
    stageIndex: progress.stageIndex,
    stageCount: progress.stageCount,
    answeredSteps: progress.answeredSteps,
    totalSteps: progress.totalSteps,
  };
}

const COMPLETED_PROGRESS: ProgressDTO = { percent: 100, stageIndex: 0, stageCount: 0, answeredSteps: 0, totalSteps: 0 };

async function toStepDTO(engine: QuizEngine, step: FlowStep, answers: Answers, progress: Progress): Promise<StepDTO> {
  const stage = engine.definition.stages.find((s) => s.id === step.stageId);
  const flow = engine.buildFlow(answers);
  const base = {
    id: step.id,
    kind: step.kind,
    stage: {
      id: step.stageId,
      title: stage?.title ?? '',
      description: stage?.description ?? '',
      index: progress.stageIndex,
      count: progress.stageCount,
    },
    selected: flow.effectiveAnswers[step.id] ?? [],
    isFirst: flow.steps[0]?.id === step.id,
  };

  if (step.kind === 'question') {
    const { question } = step;
    return {
      ...base,
      text: question.text,
      helpText: question.helpText ?? null,
      type: question.type,
      required: question.required,
      maxSelections: question.maxSelections ?? null,
      scaleMinLabel: question.scaleMinLabel ?? null,
      scaleMaxLabel: question.scaleMaxLabel ?? null,
      options: question.options.map((option) => ({ id: option.id, label: option.label })),
      module: null,
    };
  }

  const bookModule = await db().bookModule.findUnique({ where: { id: step.moduleId } });
  return {
    ...base,
    text: 'Você concorda com o valor desta seção do livro?',
    helpText: 'Responder não gera nenhuma cobrança. Sua resposta só ajuda a montar a sua recomendação.',
    type: 'single',
    required: true,
    maxSelections: null,
    scaleMinLabel: null,
    scaleMaxLabel: null,
    options: PRICE_OPTIONS.map((option) => ({ id: option.id, label: option.label })),
    module: bookModule
      ? {
          slug: bookModule.slug,
          title: bookModule.title,
          subtitle: bookModule.subtitle,
          description: bookModule.description,
          priceCents: bookModule.priceCents,
          coverEmoji: bookModule.coverEmoji,
          highlights: extractHighlights(bookModule.previewContent, 4),
        }
      : null,
  };
}

/**
 * Estado atual do quiz para a interface. `at` + `direction` permitem navegar:
 * - sem `at`: próximo passo ainda não respondido;
 * - `at` + `current`: o próprio passo (se visível);
 * - `at` + `prev`: o passo anterior.
 */
export async function buildQuizState(
  engine: QuizEngine,
  session: QuizSession,
  token: string,
  options: { at?: string | null; direction?: 'current' | 'prev' } = {},
): Promise<QuizStateDTO> {
  if (session.status === 'completed') {
    return { status: 'completed', resultPath: `/resultado/${token}`, progress: COMPLETED_PROGRESS };
  }

  const answers = parseAnswers(session.answersJson);
  let step: FlowStep | null = null;
  if (options.at) {
    step = options.direction === 'prev' ? engine.getStepBefore(answers, options.at) : engine.getStep(answers, options.at);
  }
  step ??= engine.getNextStep(answers);

  if (!step) {
    // Todas as respostas já existem (ex.: sessão retomada depois de uma falha): conclui agora.
    return completeQuizSession(engine, session.id, answers, token, false);
  }

  const progress = engine.getProgress(answers, step.id);
  return { status: 'in_progress', step: await toStepDTO(engine, step, answers, progress), progress: toProgressDTO(progress) };
}

export interface AnswerInput {
  stepId: string;
  optionIds: string[];
  msOnStep?: number;
}

export async function answerQuizStep(
  engine: QuizEngine,
  sessionId: string,
  token: string,
  input: AnswerInput,
  consent: boolean,
): Promise<QuizStateDTO> {
  // Leitura + gravação na mesma transação: duas abas respondendo ao mesmo tempo não perdem respostas.
  const { updated, session } = await db().$transaction(async (tx) => {
    const current = await tx.quizSession.findUnique({ where: { id: sessionId } });
    if (!current) throw new HttpError(404, 'session_not_found', 'Sessão não encontrada. Comece o quiz novamente.');
    if (current.status !== 'in_progress') {
      throw new HttpError(409, 'quiz_completed', 'Este quiz já foi concluído. Você pode ver o resultado ou refazer.');
    }
    const next = engine.applyAnswer(parseAnswers(current.answersJson), input.stepId, input.optionIds);
    const saved = await tx.quizSession.update({ where: { id: sessionId }, data: { answersJson: JSON.stringify(next) } });
    return { updated: next, session: saved };
  });

  const step = engine.getStep(updated, input.stepId);
  if (step) {
    await trackEvent(
      consent,
      'step_answered',
      {
        stepId: step.id,
        stepKind: step.kind,
        stageId: step.stageId,
        ...(input.msOnStep !== undefined ? { msOnStep: input.msOnStep } : {}),
      },
      session.id,
    );
    if (step.kind === 'price') {
      const bookModule = engine.definition.modules.find((m) => m.id === step.moduleId);
      const response = updated[step.id]?.[0];
      if (bookModule && (response === 'agree' || response === 'maybe' || response === 'disagree')) {
        await trackEvent(consent, 'price_question_answered', { moduleId: bookModule.id, priceCents: bookModule.priceCents, response }, session.id);
      }
    }
  }

  const following = engine.getStepAfter(updated, input.stepId);
  if (!following && engine.isComplete(updated)) {
    return completeQuizSession(engine, session.id, updated, token, consent);
  }
  return buildQuizState(engine, session, token, following ? { at: following.id } : {});
}

/** Calcula e "congela" o resultado. Respostas de passos que ficaram ocultos são descartadas. */
export async function completeQuizSession(
  engine: QuizEngine,
  sessionId: string,
  answers: Answers,
  token: string,
  consent: boolean,
): Promise<QuizStateDTO> {
  const result = engine.computeResult(answers);
  await db().quizSession.update({
    where: { id: sessionId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      answersJson: JSON.stringify(engine.pruneAnswers(answers)),
      resultJson: JSON.stringify(result),
      primaryCategoryId: result.primary?.categoryId ?? null,
    },
  });
  await trackEvent(
    consent,
    'quiz_completed',
    {
      primaryCategoryId: result.primary?.categoryId ?? null,
      secondaryCount: result.secondary.length,
      flags: result.flags.slice(0, 10),
    },
    sessionId,
  );
  return { status: 'completed', resultPath: `/resultado/${token}`, progress: COMPLETED_PROGRESS };
}
