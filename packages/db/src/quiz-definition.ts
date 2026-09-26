import {
  DEFAULT_ENGINE_SETTINGS,
  engineSettingsSchema,
  parseConditionJson,
  parseEffectsJson,
  type Condition,
  type EngineSettings,
  type QuestionType,
  type QuizDefinition,
  type RuleDef,
} from '@relacionamentos/quiz-engine';
import type { PrismaClient } from './generated/prisma/client';

export const ENGINE_SETTINGS_KEY = 'engine';

export interface DefinitionLoadIssue {
  type: 'stage' | 'question' | 'rule' | 'settings';
  id: string;
  message: string;
}

const QUESTION_TYPES: readonly QuestionType[] = ['single', 'multiple', 'scale'];

export async function loadEngineSettings(prisma: PrismaClient): Promise<EngineSettings> {
  const row = await prisma.setting.findUnique({ where: { key: ENGINE_SETTINGS_KEY } });
  if (!row) return DEFAULT_ENGINE_SETTINGS;
  try {
    return engineSettingsSchema.parse(JSON.parse(row.value));
  } catch {
    return DEFAULT_ENGINE_SETTINGS;
  }
}

/**
 * Monta a definição do quiz a partir do banco, considerando apenas itens ativos.
 * Problemas de leitura (ex.: JSON de condição inválido) não derrubam o quiz: o item afetado é
 * tratado de forma segura e o problema é reportado em `issues` (exibido no painel admin).
 */
export async function loadQuizDefinition(
  prisma: PrismaClient,
): Promise<{ definition: QuizDefinition; issues: DefinitionLoadIssue[] }> {
  const [categories, stages, modules, rules, settings] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, orderBy: [{ position: 'asc' }, { name: 'asc' }] }),
    prisma.stage.findMany({
      where: { active: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: {
        questions: {
          where: { active: true },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          include: { options: { orderBy: { position: 'asc' }, include: { weights: true } } },
        },
      },
    }),
    prisma.bookModule.findMany({
      where: { active: true },
      orderBy: [{ position: 'asc' }, { title: 'asc' }],
      include: { categories: true },
    }),
    prisma.rule.findMany({ where: { active: true }, orderBy: [{ priority: 'desc' }, { id: 'asc' }] }),
    loadEngineSettings(prisma),
  ]);

  const issues: DefinitionLoadIssue[] = [];
  const activeCategoryIds = new Set(categories.map((category) => category.id));

  const condition = (json: string | null, type: DefinitionLoadIssue['type'], id: string): Condition | null => {
    try {
      return parseConditionJson(json);
    } catch {
      issues.push({ type, id, message: 'Condição com formato inválido — foi ignorada.' });
      return null;
    }
  };

  const definition: QuizDefinition = {
    categories: categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      shortDescription: category.shortDescription,
      explanation: category.explanation,
      color: category.color,
      position: category.position,
    })),
    stages: stages.map((stage) => ({
      id: stage.id,
      title: stage.title,
      description: stage.description,
      condition: condition(stage.conditionJson, 'stage', stage.id),
      offer: stage.offerModuleId
        ? {
            moduleId: stage.offerModuleId,
            priceQuestionEnabled: stage.priceQuestionEnabled,
            minScore: stage.priceQuestionMinScore,
          }
        : null,
      questions: stage.questions.map((question) => ({
        id: question.id,
        stageId: stage.id,
        text: question.text,
        helpText: question.helpText,
        type: QUESTION_TYPES.includes(question.type as QuestionType) ? (question.type as QuestionType) : 'single',
        required: question.required,
        maxSelections: question.maxSelections,
        scaleMinLabel: question.scaleMinLabel,
        scaleMaxLabel: question.scaleMaxLabel,
        condition: condition(question.conditionJson, 'question', question.id),
        options: question.options.map((option) => ({
          id: option.id,
          label: option.label,
          weights: Object.fromEntries(
            option.weights
              .filter((weight) => activeCategoryIds.has(weight.categoryId) && weight.weight !== 0)
              .map((weight) => [weight.categoryId, weight.weight]),
          ),
        })),
      })),
    })),
    modules: modules.map((module) => ({
      id: module.id,
      slug: module.slug,
      title: module.title,
      subtitle: module.subtitle,
      description: module.description,
      priceCents: module.priceCents,
      categoryIds: module.categories
        .map((link) => link.categoryId)
        .filter((categoryId) => activeCategoryIds.has(categoryId)),
      position: module.position,
    })),
    rules: rules.flatMap((rule): RuleDef[] => {
      try {
        return [
          {
            id: rule.id,
            name: rule.name,
            priority: rule.priority,
            condition: parseConditionJson(rule.conditionJson) ?? { all: [] },
            effects: parseEffectsJson(rule.effectsJson),
          },
        ];
      } catch {
        issues.push({ type: 'rule', id: rule.id, message: `Regra "${rule.name}" com JSON inválido — desativada.` });
        return [];
      }
    }),
    settings,
  };

  return { definition, issues };
}
