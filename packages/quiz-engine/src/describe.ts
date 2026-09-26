import type { Condition, QuizDefinition, RuleEffect } from './types';

const SCORE_OPERATORS = { gte: '≥', gt: '>', lte: '≤', lt: '<' } as const;

interface Lookup {
  question: (id: string) => string;
  option: (id: string) => string;
  category: (id: string) => string;
  module: (id: string) => string;
}

function lookupFor(def: QuizDefinition): Lookup {
  const questions = new Map<string, string>();
  const options = new Map<string, string>();
  for (const stage of def.stages) {
    for (const question of stage.questions) {
      questions.set(question.id, question.text);
      for (const option of question.options) options.set(option.id, option.label);
    }
  }
  const categories = new Map(def.categories.map((c) => [c.id, c.name]));
  const modules = new Map(def.modules.map((m) => [m.id, m.title]));
  return {
    question: (id) => questions.get(id) ?? `(pergunta ${id})`,
    option: (id) => options.get(id) ?? `(opção ${id})`,
    category: (id) => categories.get(id) ?? `(categoria ${id})`,
    module: (id) => modules.get(id) ?? `(módulo ${id})`,
  };
}

/** Descrição legível (pt-BR) de uma condição — usada no painel admin. */
export function describeCondition(condition: Condition | null | undefined, def: QuizDefinition): string {
  if (!condition) return 'Sempre';
  return describe(condition, lookupFor(def));
}

function describe(condition: Condition, lookup: Lookup): string {
  if ('all' in condition) {
    if (condition.all.length === 0) return 'Sempre';
    return condition.all.map((c) => wrap(c, lookup)).join(' E ');
  }
  if ('any' in condition) {
    if (condition.any.length === 0) return 'Nunca';
    return condition.any.map((c) => wrap(c, lookup)).join(' OU ');
  }
  if ('not' in condition) return `NÃO (${describe(condition.not, lookup)})`;
  if ('answer' in condition) {
    const { questionId, op, optionIds = [] } = condition.answer;
    const question = `“${lookup.question(questionId)}”`;
    const options = optionIds.map((id) => `“${lookup.option(id)}”`).join(' ou ');
    switch (op) {
      case 'selected':
        return `${question} = ${options}`;
      case 'notSelected':
        return `${question} ≠ ${options}`;
      case 'answered':
        return `${question} foi respondida`;
      case 'notAnswered':
        return `${question} não foi respondida`;
    }
  }
  if ('score' in condition) {
    const { categoryId, op, value } = condition.score;
    return `Pontuação de ${lookup.category(categoryId)} ${SCORE_OPERATORS[op]} ${value}`;
  }
  return '?';
}

function wrap(condition: Condition, lookup: Lookup): string {
  const text = describe(condition, lookup);
  return 'all' in condition || 'any' in condition ? `(${text})` : text;
}

export function describeEffect(effect: RuleEffect, def: QuizDefinition): string {
  const lookup = lookupFor(def);
  switch (effect.type) {
    case 'addScore':
      return `${effect.value >= 0 ? 'Somar' : 'Subtrair'} ${Math.abs(effect.value)} pontos em ${lookup.category(effect.categoryId)}`;
    case 'multiplyScore':
      return `Multiplicar ${lookup.category(effect.categoryId)} por ${effect.factor}`;
    case 'recommendModule':
      return `Recomendar o módulo ${lookup.module(effect.moduleId)}`;
    case 'addFlag':
      return `Adicionar sinalizador “${effect.flag}”`;
  }
}
