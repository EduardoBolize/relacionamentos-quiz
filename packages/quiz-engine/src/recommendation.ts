import { buildFlow, isPriceAgreement } from './flow';
import { applyRules } from './rules';
import { roundScore } from './scoring';
import type {
  Answers,
  CategoryScore,
  PriceAgreement,
  QuizDefinition,
  QuizResult,
  RecommendationReason,
  RecommendedModule,
} from './types';

export const ENGINE_VERSION = '1.0.0';

/** Sinalizador usado quando as respostas sugerem que a pessoa pode precisar de apoio imediato. */
export const SAFETY_FLAG = 'safety_support';

/** Concordância com o valor de cada módulo, a partir das perguntas de fim de etapa. */
export function collectPriceAgreements(
  def: QuizDefinition,
  effectiveAnswers: Answers,
): Record<string, PriceAgreement> {
  const agreements: Record<string, PriceAgreement> = {};
  for (const stage of def.stages) {
    if (!stage.offer) continue;
    const value = effectiveAnswers[`price:${stage.id}`]?.[0];
    if (isPriceAgreement(value)) agreements[stage.offer.moduleId] = value;
  }
  return agreements;
}

/**
 * Calcula o resultado completo: pontuações, tema principal, temas secundários e módulos do livro
 * recomendados. O resultado **não é um diagnóstico** — indica apenas quais temas mais apareceram
 * nas respostas.
 */
export function computeResult(def: QuizDefinition, answers: Answers): QuizResult {
  const flow = buildFlow(def, answers);
  const { accumulator, effectiveAnswers } = flow;
  const baseScores = accumulator.snapshot();
  const rules = applyRules(def, effectiveAnswers, baseScores);

  const positionOf = new Map(def.categories.map((category, index) => [category.id, category.position ?? index]));

  const ranked: CategoryScore[] = def.categories
    .map((category) => ({
      categoryId: category.id,
      raw: accumulator.rawOf(category.id),
      max: accumulator.maxOf(category.id),
      baseScore: roundScore(baseScores[category.id] ?? 0),
      score: roundScore(rules.scores[category.id] ?? 0),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.raw - a.raw ||
        (positionOf.get(a.categoryId) ?? 0) - (positionOf.get(b.categoryId) ?? 0),
    );

  const { primaryMinScore, secondaryMinScore, maxSecondary } = def.settings;
  const top = ranked[0];
  const primary = top && top.score > 0 && top.score >= primaryMinScore ? top : null;
  const secondary = primary
    ? ranked
        .slice(1)
        .filter((entry) => entry.score > 0 && entry.score >= secondaryMinScore)
        .slice(0, Math.max(0, maxSecondary))
    : [];

  const priceAgreements = collectPriceAgreements(def, effectiveAnswers);
  const recommendedModules = buildRecommendations(def, {
    primary,
    secondary,
    top: top ?? null,
    ruleModuleIds: rules.recommendedModuleIds,
    priceAgreements,
  });

  return {
    engineVersion: ENGINE_VERSION,
    primary,
    secondary,
    scores: ranked,
    recommendedModules,
    priceAgreements,
    flags: rules.flags,
    appliedRuleIds: rules.appliedRuleIds,
  };
}

interface RecommendationInput {
  primary: CategoryScore | null;
  secondary: CategoryScore[];
  top: CategoryScore | null;
  ruleModuleIds: string[];
  priceAgreements: Record<string, PriceAgreement>;
}

function buildRecommendations(def: QuizDefinition, input: RecommendationInput): RecommendedModule[] {
  const modules = [...def.modules].sort((a, b) => a.position - b.position);
  const moduleIds = new Set(modules.map((module) => module.id));
  const result: RecommendedModule[] = [];

  const add = (moduleId: string, reason: RecommendationReason, categoryId?: string) => {
    if (!moduleIds.has(moduleId) || result.some((entry) => entry.moduleId === moduleId)) return;
    const priceAgreement = input.priceAgreements[moduleId];
    result.push({
      moduleId,
      reason,
      ...(categoryId ? { categoryId } : {}),
      ...(priceAgreement ? { priceAgreement } : {}),
      preselected: priceAgreement === 'agree',
    });
  };
  const modulesOf = (categoryId: string) =>
    modules.filter((module) => module.categoryIds.includes(categoryId));

  if (input.primary) {
    for (const module of modulesOf(input.primary.categoryId)) add(module.id, 'primary', input.primary.categoryId);
  }
  for (const entry of input.secondary) {
    for (const module of modulesOf(entry.categoryId)) add(module.id, 'secondary', entry.categoryId);
  }
  for (const moduleId of input.ruleModuleIds) add(moduleId, 'rule');
  for (const [moduleId, agreement] of Object.entries(input.priceAgreements)) {
    if (agreement === 'agree') add(moduleId, 'price_agreed');
  }
  if (!input.primary && input.top && input.top.score > 0) {
    for (const module of modulesOf(input.top.categoryId)) add(module.id, 'explore', input.top.categoryId);
  }

  // Sem nenhuma concordância explícita, sugere pré-selecionar o módulo do tema principal
  // (desde que a pessoa não tenha discordado do valor dele).
  if (!result.some((entry) => entry.preselected)) {
    const first = result.find((entry) => entry.reason === 'primary' && entry.priceAgreement !== 'disagree');
    if (first) first.preselected = true;
  }

  return result;
}
