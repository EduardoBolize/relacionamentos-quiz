import 'server-only';
import { parseConditionJson, parseEffectsJson, type Condition, type RuleEffect } from '@relacionamentos/quiz-engine';
import { db } from '../db';

/** Dados de referência para os construtores de condição/efeito do painel. */
export interface ReferenceData {
  questions: { id: string; label: string; stageTitle: string; options: { id: string; label: string }[] }[];
  categories: { id: string; name: string }[];
  modules: { id: string; title: string }[];
}

export async function getReferenceData(): Promise<ReferenceData> {
  const [stages, categories, modules] = await Promise.all([
    db().stage.findMany({
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: {
        questions: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          include: { options: { orderBy: { position: 'asc' } } },
        },
      },
    }),
    db().category.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }] }),
    db().bookModule.findMany({ orderBy: [{ position: 'asc' }, { title: 'asc' }] }),
  ]);

  return {
    questions: stages.flatMap((stage) =>
      stage.questions.map((question) => ({
        id: question.id,
        label: question.text,
        stageTitle: stage.title,
        options: question.options.map((option) => ({ id: option.id, label: option.label })),
      })),
    ),
    categories: categories.map((category) => ({ id: category.id, name: category.name })),
    modules: modules.map((module) => ({ id: module.id, title: module.title })),
  };
}

/** Lê uma condição salva; se estiver corrompida, devolve `null` e sinaliza. */
export function safeCondition(json: string | null): { condition: Condition | null; invalid: boolean } {
  try {
    return { condition: parseConditionJson(json), invalid: false };
  } catch {
    return { condition: null, invalid: true };
  }
}

export function safeEffects(json: string): { effects: RuleEffect[]; invalid: boolean } {
  try {
    return { effects: parseEffectsJson(json), invalid: false };
  } catch {
    return { effects: [], invalid: true };
  }
}

export function maskEmailForAdmin(email: string): string {
  const [user = '', domain = ''] = email.split('@');
  return `${user.slice(0, 2)}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}
