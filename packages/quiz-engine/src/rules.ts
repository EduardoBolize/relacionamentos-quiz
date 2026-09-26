import { evaluateCondition } from './conditions';
import { clampScore } from './scoring';
import type { Answers, QuizDefinition, RuleDef } from './types';

export interface RulesOutcome {
  /** Pontuações finais (0–100) após os efeitos das regras. */
  scores: Record<string, number>;
  flags: string[];
  recommendedModuleIds: string[];
  appliedRuleIds: string[];
}

/** Maior prioridade primeiro; empate resolvido pelo id para o resultado ser determinístico. */
export function sortRules(rules: readonly RuleDef[]): RuleDef[] {
  return [...rules].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

/**
 * Aplica as regras condicionais.
 *
 * As **condições** de todas as regras são avaliadas sobre as pontuações base (antes de qualquer
 * regra), o que torna a ativação de uma regra independente das demais. Os **efeitos** são aplicados
 * em ordem de prioridade (isso importa quando se combina soma e multiplicação).
 */
export function applyRules(
  def: QuizDefinition,
  answers: Answers,
  baseScores: Record<string, number>,
): RulesOutcome {
  const scores: Record<string, number> = { ...baseScores };
  const categoryIds = new Set(def.categories.map((category) => category.id));
  const moduleIds = new Set(def.modules.map((module) => module.id));
  const flags: string[] = [];
  const recommendedModuleIds: string[] = [];
  const appliedRuleIds: string[] = [];
  const context = { answers, scores: baseScores };

  for (const rule of sortRules(def.rules)) {
    if (!evaluateCondition(rule.condition, context)) continue;
    appliedRuleIds.push(rule.id);

    for (const effect of rule.effects) {
      switch (effect.type) {
        case 'addScore':
          if (categoryIds.has(effect.categoryId)) {
            scores[effect.categoryId] = clampScore((scores[effect.categoryId] ?? 0) + effect.value);
          }
          break;
        case 'multiplyScore':
          if (categoryIds.has(effect.categoryId)) {
            scores[effect.categoryId] = clampScore((scores[effect.categoryId] ?? 0) * effect.factor);
          }
          break;
        case 'recommendModule':
          if (moduleIds.has(effect.moduleId) && !recommendedModuleIds.includes(effect.moduleId)) {
            recommendedModuleIds.push(effect.moduleId);
          }
          break;
        case 'addFlag':
          if (!flags.includes(effect.flag)) flags.push(effect.flag);
          break;
      }
    }
  }

  return { scores, flags, recommendedModuleIds, appliedRuleIds };
}
