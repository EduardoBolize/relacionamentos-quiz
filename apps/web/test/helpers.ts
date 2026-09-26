import type { QuizStateDTO } from '@/lib/dto';
import { getEngine, invalidateQuizDefinition } from '@/server/definition';
import { db } from '@/server/db';
import { answerQuizStep, buildQuizState, createQuizSession, findSessionByToken } from '@/server/services/quiz-service';

export const ORIGIN = 'http://localhost:3000';

/** Escolhas padrão: a opção "tranquila" (sem pesos) — o equivalente a um perfil sem temas em destaque. */
export async function calmChoiceFor(stepId: string): Promise<string[]> {
  if (stepId.startsWith('price:')) return ['maybe'];
  const engine = await getEngine();
  const question = engine.definition.stages.flatMap((stage) => stage.questions).find((q) => q.id === stepId);
  if (!question) throw new Error(`Pergunta ${stepId} não encontrada`);
  const calm = question.options.find((option) => Object.keys(option.weights).length === 0) ?? question.options[0]!;
  return [calm.id];
}

/**
 * Responde o quiz inteiro pelos serviços (o mesmo caminho das rotas de API).
 * `choices` sobrescreve respostas específicas; `stopAfter` interrompe depois de N respostas.
 */
export async function playQuiz(
  choices: Record<string, string[]> = {},
  options: { stopAfter?: number } = {},
): Promise<{ token: string; sessionId: string; state: QuizStateDTO; visited: string[] }> {
  invalidateQuizDefinition();
  const engine = await getEngine();
  const { session, token } = await createQuizSession();
  let state = await buildQuizState(engine, session, token);
  const visited: string[] = [];

  for (let i = 0; i < 60 && state.status === 'in_progress'; i += 1) {
    if (options.stopAfter !== undefined && visited.length >= options.stopAfter) break;
    const step = state.step;
    visited.push(step.id);
    const optionIds = choices[step.id] ?? (await calmChoiceFor(step.id));
    state = await answerQuizStep(engine, session.id, token, { stepId: step.id, optionIds }, false);
  }
  return { token, sessionId: session.id, state, visited };
}

export async function reloadSession(token: string) {
  const session = await findSessionByToken(token);
  if (!session) throw new Error('Sessão não encontrada');
  return session;
}

export async function lastEmailTo(to: string) {
  return db().emailOutbox.findFirst({ where: { to }, orderBy: { createdAt: 'desc' } });
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Caminho com forte ênfase em conflitos (inclui o sinal de cuidado). */
export const CONFLICT_CHOICES: Record<string, string[]> = {
  q_status: ['opt_status_juntos'],
  q_motivo: ['opt_motivo_brigas'],
  q_confl_freq: ['opt_confl_freq_dia'],
  q_confl_fim: ['opt_confl_fim_repete'],
  q_confl_medo: ['opt_confl_medo_frequente'],
  'price:stg_conflitos': ['agree'],
};
