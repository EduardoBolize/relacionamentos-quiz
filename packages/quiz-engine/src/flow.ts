import { evaluateCondition } from './conditions';
import { ScoreAccumulator } from './scoring';
import type {
  Answers,
  FlowStep,
  PriceAgreement,
  Progress,
  QuestionDef,
  QuizDefinition,
} from './types';

// ───────────────────── Pergunta de concordância com o valor ─────────────────────

export const PRICE_STEP_PREFIX = 'price:';

export const PRICE_OPTIONS: ReadonlyArray<{ id: PriceAgreement; label: string }> = [
  { id: 'agree', label: 'Sim, concordo com o valor' },
  { id: 'maybe', label: 'Quero ver a prévia antes de decidir' },
  { id: 'disagree', label: 'Não concordo com esse valor' },
];

const PRICE_OPTION_IDS: readonly string[] = PRICE_OPTIONS.map((option) => option.id);

export function priceStepId(stageId: string): string {
  return `${PRICE_STEP_PREFIX}${stageId}`;
}

export function isPriceStepId(stepId: string): boolean {
  return stepId.startsWith(PRICE_STEP_PREFIX);
}

export function isPriceAgreement(value: unknown): value is PriceAgreement {
  return typeof value === 'string' && PRICE_OPTION_IDS.includes(value);
}

// ───────────────────────────── Fluxo ─────────────────────────────

export interface FlowState {
  /** Passos visíveis, na ordem, considerando as respostas atuais. */
  steps: FlowStep[];
  /** Somente as respostas de passos visíveis (respostas "órfãs" são ignoradas). */
  effectiveAnswers: Answers;
  /** Pontuações base acumuladas pelas respostas efetivas. */
  accumulator: ScoreAccumulator;
  /** Etapas visíveis (com ao menos uma pergunta visível), na ordem. */
  stageIds: string[];
}

export class AnswerError extends Error {
  constructor(
    readonly code:
      | 'step_not_available'
      | 'step_out_of_order'
      | 'invalid_option'
      | 'selection_required'
      | 'too_many_selections',
    message: string,
  ) {
    super(message);
    this.name = 'AnswerError';
  }
}

/**
 * Normaliza a seleção armazenada para uma pergunta.
 * Retorna `null` quando não há resposta válida e `[]` quando uma pergunta opcional foi pulada.
 */
export function sanitizeSelection(
  question: QuestionDef,
  selected: readonly string[] | undefined,
): string[] | null {
  if (selected === undefined) return null;
  if (selected.length === 0) return question.required ? null : [];

  const validIds = new Set(question.options.map((option) => option.id));
  const unique = [...new Set(selected)].filter((id) => validIds.has(id));
  if (unique.length === 0) return null;

  if (question.type !== 'multiple') return unique.slice(0, 1);
  if (question.maxSelections && question.maxSelections > 0) {
    return unique.slice(0, question.maxSelections);
  }
  return unique;
}

/**
 * Monta o fluxo adaptativo. As condições de cada etapa/pergunta são avaliadas **em ordem**,
 * usando apenas respostas e pontuações dos passos anteriores — por isso não existem
 * dependências circulares.
 */
export function buildFlow(def: QuizDefinition, answers: Answers): FlowState {
  const accumulator = new ScoreAccumulator(def.categories.map((category) => category.id));
  const effectiveAnswers: Answers = {};
  const steps: FlowStep[] = [];
  const stageIds: string[] = [];
  const moduleById = new Map(def.modules.map((module) => [module.id, module]));
  const context = () => ({ answers: effectiveAnswers, scores: accumulator.snapshot() });

  for (const stage of def.stages) {
    if (!evaluateCondition(stage.condition, context())) continue;

    let visibleQuestions = 0;
    for (const question of stage.questions) {
      if (!evaluateCondition(question.condition, context())) continue;
      visibleQuestions += 1;
      steps.push({ kind: 'question', id: question.id, stageId: stage.id, question });

      const selection = sanitizeSelection(question, answers[question.id]);
      if (selection !== null) {
        effectiveAnswers[question.id] = selection;
        accumulator.add(question, selection);
      }
    }

    if (visibleQuestions === 0) continue;
    stageIds.push(stage.id);

    const offer = stage.offer;
    const module = offer ? moduleById.get(offer.moduleId) : undefined;
    if (!offer || !module || !offer.priceQuestionEnabled) continue;

    const relevance = Math.max(0, ...module.categoryIds.map((id) => accumulator.normalized(id)));
    if (offer.minScore > 0 && relevance < offer.minScore) continue;

    const id = priceStepId(stage.id);
    steps.push({ kind: 'price', id, stageId: stage.id, moduleId: module.id });
    const agreement = answers[id]?.[0];
    if (isPriceAgreement(agreement)) effectiveAnswers[id] = [agreement];
  }

  return { steps, effectiveAnswers, accumulator, stageIds };
}

export function isStepAnswered(flow: FlowState, stepId: string): boolean {
  return Object.hasOwn(flow.effectiveAnswers, stepId);
}

/** Primeiro passo visível ainda não respondido (ou `null` quando o quiz terminou). */
export function getNextStep(def: QuizDefinition, answers: Answers): FlowStep | null {
  const flow = buildFlow(def, answers);
  return flow.steps.find((step) => !isStepAnswered(flow, step.id)) ?? null;
}

export function getStep(def: QuizDefinition, answers: Answers, stepId: string): FlowStep | null {
  return buildFlow(def, answers).steps.find((step) => step.id === stepId) ?? null;
}

export function getStepAfter(
  def: QuizDefinition,
  answers: Answers,
  stepId: string,
): FlowStep | null {
  const { steps } = buildFlow(def, answers);
  const index = steps.findIndex((step) => step.id === stepId);
  return index === -1 ? null : (steps[index + 1] ?? null);
}

export function getStepBefore(
  def: QuizDefinition,
  answers: Answers,
  stepId: string,
): FlowStep | null {
  const { steps } = buildFlow(def, answers);
  const index = steps.findIndex((step) => step.id === stepId);
  return index > 0 ? (steps[index - 1] ?? null) : null;
}

export function isComplete(def: QuizDefinition, answers: Answers): boolean {
  const flow = buildFlow(def, answers);
  return flow.steps.length > 0 && flow.steps.every((step) => isStepAnswered(flow, step.id));
}

/** Remove respostas de passos que não estão mais visíveis (minimização de dados). */
export function pruneAnswers(def: QuizDefinition, answers: Answers): Answers {
  return buildFlow(def, answers).effectiveAnswers;
}

/**
 * Progresso por etapa: cada etapa visível vale a mesma fração da barra e, dentro dela, conta a
 * proporção de passos respondidos. Isso evita "saltos para trás" quando perguntas condicionais surgem.
 */
export function getProgress(
  def: QuizDefinition,
  answers: Answers,
  currentStepId?: string | null,
): Progress {
  const flow = buildFlow(def, answers);
  const totalSteps = flow.steps.length;
  const answeredSteps = flow.steps.filter((step) => isStepAnswered(flow, step.id)).length;
  const nextStep = flow.steps.find((step) => !isStepAnswered(flow, step.id)) ?? null;
  const stageCount = flow.stageIds.length;

  let fraction = 0;
  for (const stageId of flow.stageIds) {
    const stageSteps = flow.steps.filter((step) => step.stageId === stageId);
    const done = stageSteps.filter((step) => isStepAnswered(flow, step.id)).length;
    fraction += stageSteps.length > 0 ? done / stageSteps.length : 1;
  }

  let percent = stageCount > 0 ? Math.round((fraction / stageCount) * 100) : 0;
  if (nextStep) percent = Math.min(percent, 99);
  else if (totalSteps > 0) percent = 100;

  const displayedStep = currentStepId
    ? (flow.steps.find((step) => step.id === currentStepId) ?? nextStep)
    : nextStep;
  const currentStageId = displayedStep?.stageId ?? flow.stageIds[flow.stageIds.length - 1] ?? null;
  const stageIndex = currentStageId ? Math.max(0, flow.stageIds.indexOf(currentStageId)) : 0;

  return { answeredSteps, totalSteps, percent, stageIndex, stageCount, currentStageId };
}

/**
 * Valida e registra uma resposta. Só é possível responder passos visíveis e até o primeiro passo
 * ainda não respondido (não dá para "pular" perguntas obrigatórias pela API).
 */
export function applyAnswer(
  def: QuizDefinition,
  answers: Answers,
  stepId: string,
  optionIds: readonly string[],
): Answers {
  const flow = buildFlow(def, answers);
  const index = flow.steps.findIndex((step) => step.id === stepId);
  if (index === -1) {
    throw new AnswerError('step_not_available', 'Esta pergunta não está disponível no momento.');
  }

  const firstUnanswered = flow.steps.findIndex((step) => !isStepAnswered(flow, step.id));
  if (firstUnanswered !== -1 && index > firstUnanswered) {
    throw new AnswerError('step_out_of_order', 'Responda as perguntas anteriores primeiro.');
  }

  const step = flow.steps[index]!;
  const unique = [...new Set(optionIds)];

  if (step.kind === 'price') {
    if (unique.length !== 1 || !isPriceAgreement(unique[0])) {
      throw new AnswerError('invalid_option', 'Escolha uma das opções.');
    }
    return { ...answers, [stepId]: unique };
  }

  const { question } = step;
  const validIds = new Set(question.options.map((option) => option.id));
  if (unique.some((id) => !validIds.has(id))) {
    throw new AnswerError('invalid_option', 'Opção inválida para esta pergunta.');
  }
  if (unique.length === 0 && question.required) {
    throw new AnswerError('selection_required', 'Escolha uma opção para continuar.');
  }
  if (question.type !== 'multiple' && unique.length > 1) {
    throw new AnswerError('too_many_selections', 'Escolha apenas uma opção.');
  }
  if (question.type === 'multiple' && question.maxSelections && unique.length > question.maxSelections) {
    throw new AnswerError(
      'too_many_selections',
      `Escolha no máximo ${question.maxSelections} opções.`,
    );
  }

  return { ...answers, [stepId]: unique };
}
