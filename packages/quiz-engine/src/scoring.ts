import type { QuestionDef } from './types';

/**
 * Contribuição máxima que uma pergunta pode dar a uma categoria.
 * - `single`/`scale`: o maior peso positivo entre as opções;
 * - `multiple`: a soma dos maiores pesos positivos, respeitando `maxSelections`.
 */
export function questionMaxContribution(question: QuestionDef, categoryId: string): number {
  const positives = question.options
    .map((option) => option.weights[categoryId] ?? 0)
    .filter((weight) => weight > 0)
    .sort((a, b) => b - a);

  if (positives.length === 0) return 0;
  if (question.type !== 'multiple') return positives[0] ?? 0;

  const limit =
    question.maxSelections && question.maxSelections > 0 ? question.maxSelections : positives.length;
  return positives.slice(0, limit).reduce((sum, weight) => sum + weight, 0);
}

/** Soma dos pesos das opções escolhidas para uma categoria. */
export function answerContribution(
  question: QuestionDef,
  selectedOptionIds: readonly string[],
  categoryId: string,
): number {
  let sum = 0;
  for (const option of question.options) {
    if (selectedOptionIds.includes(option.id)) sum += option.weights[categoryId] ?? 0;
  }
  return sum;
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/** Arredonda para 1 casa decimal (evita ruído de ponto flutuante nos resultados). */
export function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Acumula pontuações por categoria.
 *
 * A normalização considera apenas as perguntas **respondidas**: a pontuação (0–100) indica o quanto
 * as respostas relacionadas a um tema apontaram para ele. Assim, temas com mais perguntas não
 * dominam o resultado só por terem mais perguntas.
 */
export class ScoreAccumulator {
  private readonly raw = new Map<string, number>();
  private readonly max = new Map<string, number>();

  constructor(private readonly categoryIds: readonly string[]) {
    for (const id of categoryIds) {
      this.raw.set(id, 0);
      this.max.set(id, 0);
    }
  }

  add(question: QuestionDef, selectedOptionIds: readonly string[]): void {
    if (selectedOptionIds.length === 0) return;
    for (const categoryId of this.categoryIds) {
      const maxContribution = questionMaxContribution(question, categoryId);
      const contribution = answerContribution(question, selectedOptionIds, categoryId);
      if (maxContribution === 0 && contribution === 0) continue;
      this.raw.set(categoryId, (this.raw.get(categoryId) ?? 0) + contribution);
      this.max.set(categoryId, (this.max.get(categoryId) ?? 0) + maxContribution);
    }
  }

  rawOf(categoryId: string): number {
    return this.raw.get(categoryId) ?? 0;
  }

  maxOf(categoryId: string): number {
    return this.max.get(categoryId) ?? 0;
  }

  normalized(categoryId: string): number {
    const max = this.maxOf(categoryId);
    if (max <= 0) return 0;
    return clampScore((this.rawOf(categoryId) / max) * 100);
  }

  /** Pontuações normalizadas de todas as categorias. */
  snapshot(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const id of this.categoryIds) result[id] = this.normalized(id);
    return result;
  }
}
