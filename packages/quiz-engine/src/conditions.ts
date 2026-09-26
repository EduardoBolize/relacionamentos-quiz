import type { Answers, Condition } from './types';

export interface EvaluationContext {
  /** Respostas efetivas (apenas de passos visíveis até aqui). */
  answers: Answers;
  /** Pontuações normalizadas (0–100) por categoria. */
  scores: Record<string, number>;
}

/**
 * Avalia uma condição de exibição/regra. Condição ausente é considerada verdadeira.
 * `all: []` é verdadeiro e `any: []` é falso (semântica usual de lógica).
 */
export function evaluateCondition(
  condition: Condition | null | undefined,
  ctx: EvaluationContext,
): boolean {
  if (!condition) return true;

  if ('all' in condition) return condition.all.every((c) => evaluateCondition(c, ctx));
  if ('any' in condition) return condition.any.some((c) => evaluateCondition(c, ctx));
  if ('not' in condition) return !evaluateCondition(condition.not, ctx);

  if ('answer' in condition) {
    const { questionId, op, optionIds = [] } = condition.answer;
    const selected = ctx.answers[questionId] ?? [];
    switch (op) {
      case 'answered':
        return selected.length > 0;
      case 'notAnswered':
        return selected.length === 0;
      case 'selected':
        return optionIds.some((id) => selected.includes(id));
      case 'notSelected':
        return selected.length > 0 && !optionIds.some((id) => selected.includes(id));
      default:
        return false;
    }
  }

  if ('score' in condition) {
    const { categoryId, op, value } = condition.score;
    const score = ctx.scores[categoryId] ?? 0;
    switch (op) {
      case 'gte':
        return score >= value;
      case 'gt':
        return score > value;
      case 'lte':
        return score <= value;
      case 'lt':
        return score < value;
      default:
        return false;
    }
  }

  return false;
}

/** Profundidade de aninhamento (usada para limitar condições muito complexas). */
export function conditionDepth(condition: Condition | null | undefined): number {
  if (!condition) return 0;
  if ('all' in condition) return 1 + Math.max(0, ...condition.all.map(conditionDepth));
  if ('any' in condition) return 1 + Math.max(0, ...condition.any.map(conditionDepth));
  if ('not' in condition) return 1 + conditionDepth(condition.not);
  return 1;
}

/** Percorre todas as cláusulas-folha (`answer` e `score`) de uma condição. */
export function collectClauses(
  condition: Condition | null | undefined,
  visit: (clause: Extract<Condition, { answer: unknown } | { score: unknown }>) => void,
): void {
  if (!condition) return;
  if ('all' in condition) return condition.all.forEach((c) => collectClauses(c, visit));
  if ('any' in condition) return condition.any.forEach((c) => collectClauses(c, visit));
  if ('not' in condition) return collectClauses(condition.not, visit);
  visit(condition);
}
