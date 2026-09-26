import { applyAnswer, getNextStep } from '../src';
import type { Answers, OptionDef, PriceAgreement, QuestionDef, QuizDefinition } from '../src';

export const opt = (id: string, weights: Record<string, number> = {}, label = id): OptionDef => ({
  id,
  label,
  weights,
});

export const question = (
  id: string,
  stageId: string,
  options: OptionDef[],
  extra: Partial<QuestionDef> = {},
): QuestionDef => ({
  id,
  stageId,
  text: `Pergunta ${id}`,
  type: 'single',
  required: true,
  options,
  ...extra,
});

/** Escala 0–5 em que 0 é o pior cenário (peso 5) e 5 o melhor (peso 0). */
export const scaleOptions = (prefix: string, categoryId: string): OptionDef[] =>
  [0, 1, 2, 3, 4, 5].map((value) =>
    opt(`${prefix}_${value}`, 5 - value > 0 ? { [categoryId]: 5 - value } : {}, String(value)),
  );

const category = (id: string, name: string, position: number) => ({
  id,
  slug: id.replace('cat_', ''),
  name,
  shortDescription: '',
  explanation: `Explicação de ${name}`,
  color: '#000000',
  position,
});

/**
 * Definição pequena e controlada, com:
 * - pergunta condicional por resposta (q_b2 só para quem mora junto);
 * - pergunta condicional por pontuação (q_a3 só se Comunicação ≥ 50);
 * - oferta adaptativa (pergunta de valor da etapa C só se Conflitos ≥ 40);
 * - pergunta de múltipla escolha com limite (q_b1) e pergunta opcional (q_c2);
 * - regras de sinalizador, soma + recomendação e multiplicação.
 */
export function makeDefinition(): QuizDefinition {
  return {
    categories: [
      category('cat_a', 'Comunicação', 0),
      category('cat_b', 'Confiança', 1),
      category('cat_c', 'Conflitos', 2),
    ],
    stages: [
      {
        id: 'stg_profile',
        title: 'Perfil',
        description: '',
        offer: null,
        questions: [
          question('q_status', 'stg_profile', [
            opt('q_status_juntos'),
            opt('q_status_namoro'),
            opt('q_status_solteiro'),
          ]),
        ],
      },
      {
        id: 'stg_a',
        title: 'Comunicação',
        description: '',
        offer: { moduleId: 'mod_a', priceQuestionEnabled: true, minScore: 0 },
        questions: [
          question('q_a1', 'stg_a', [
            opt('q_a1_0'),
            opt('q_a1_1', { cat_a: 2 }),
            opt('q_a1_2', { cat_a: 4, cat_c: 1 }),
          ]),
          question('q_a2', 'stg_a', scaleOptions('q_a2', 'cat_a'), { type: 'scale' }),
          question('q_a3', 'stg_a', [opt('q_a3_no'), opt('q_a3_yes', { cat_a: 3 })], {
            condition: { score: { categoryId: 'cat_a', op: 'gte', value: 50 } },
          }),
        ],
      },
      {
        id: 'stg_b',
        title: 'Confiança',
        description: '',
        offer: { moduleId: 'mod_b', priceQuestionEnabled: true, minScore: 0 },
        questions: [
          question(
            'q_b1',
            'stg_b',
            [
              opt('q_b1_x', { cat_b: 3 }),
              opt('q_b1_y', { cat_b: 2, cat_c: 1 }),
              opt('q_b1_z', { cat_b: 1 }),
              opt('q_b1_none'),
            ],
            { type: 'multiple', maxSelections: 2 },
          ),
          question('q_b2', 'stg_b', [opt('q_b2_no'), opt('q_b2_yes', { cat_b: 2 })], {
            condition: {
              answer: { questionId: 'q_status', op: 'selected', optionIds: ['q_status_juntos'] },
            },
          }),
        ],
      },
      {
        id: 'stg_c',
        title: 'Conflitos',
        description: '',
        offer: { moduleId: 'mod_c', priceQuestionEnabled: true, minScore: 40 },
        questions: [
          question('q_c1', 'stg_c', [
            opt('q_c1_never'),
            opt('q_c1_sometimes', { cat_c: 2 }),
            opt('q_c1_often', { cat_c: 4 }),
          ]),
          question('q_c2', 'stg_c', [opt('q_c2_a', { cat_c: 1 }), opt('q_c2_b', { cat_c: 3 })], {
            required: false,
          }),
        ],
      },
    ],
    modules: [
      module('mod_a', 2990, ['cat_a'], 0),
      module('mod_b', 1990, ['cat_b'], 1),
      module('mod_c', 2490, ['cat_c'], 2),
      module('mod_extra', 990, [], 3),
    ],
    rules: [
      {
        id: 'rule_flag',
        name: 'Sinal de cuidado',
        priority: 100,
        condition: { answer: { questionId: 'q_c1', op: 'selected', optionIds: ['q_c1_often'] } },
        effects: [{ type: 'addFlag', flag: 'safety_support' }],
      },
      {
        id: 'rule_boost',
        name: 'Acúmulo que vira explosão',
        priority: 10,
        condition: {
          all: [
            { answer: { questionId: 'q_a1', op: 'selected', optionIds: ['q_a1_2'] } },
            { score: { categoryId: 'cat_c', op: 'gte', value: 50 } },
          ],
        },
        effects: [
          { type: 'addScore', categoryId: 'cat_a', value: 10 },
          { type: 'recommendModule', moduleId: 'mod_extra' },
        ],
      },
      {
        id: 'rule_half',
        name: 'Metade de confiança',
        priority: 5,
        condition: { answer: { questionId: 'q_b1', op: 'selected', optionIds: ['q_b1_x'] } },
        effects: [{ type: 'multiplyScore', categoryId: 'cat_b', factor: 0.5 }],
      },
    ],
    settings: { primaryMinScore: 35, secondaryMinScore: 30, maxSecondary: 2 },
  };
}

function module(id: string, priceCents: number, categoryIds: string[], position: number) {
  return {
    id,
    slug: id.replace('_', '-'),
    title: `Módulo ${id}`,
    subtitle: '',
    description: '',
    priceCents,
    categoryIds,
    position,
  };
}

/**
 * Responde o quiz inteiro, passo a passo, como faria a interface.
 * Passos sem escolha explícita recebem a primeira opção (ou `defaultPrice` nas perguntas de valor).
 */
export function runQuiz(
  def: QuizDefinition,
  choices: Record<string, string[]> = {},
  defaultPrice: PriceAgreement = 'maybe',
): Answers {
  let answers: Answers = {};
  for (let i = 0; i < 100; i += 1) {
    const step = getNextStep(def, answers);
    if (!step) return answers;
    const choice =
      choices[step.id] ??
      (step.kind === 'price' ? [defaultPrice] : [step.question.options[0]!.id]);
    answers = applyAnswer(def, answers, step.id, choice);
  }
  throw new Error('O quiz não terminou em 100 passos');
}

/** Caminho com forte ênfase em Comunicação. */
export const COMMUNICATION_PATH: Record<string, string[]> = {
  q_status: ['q_status_juntos'],
  q_a1: ['q_a1_2'],
  q_a2: ['q_a2_0'],
  q_a3: ['q_a3_yes'],
  'price:stg_a': ['agree'],
  q_b1: ['q_b1_z'],
  q_b2: ['q_b2_no'],
  'price:stg_b': ['disagree'],
  q_c1: ['q_c1_never'],
  q_c2: [],
};

/** Caminho com conflitos intensos (aciona o sinalizador de cuidado e todas as regras). */
export const CONFLICT_PATH: Record<string, string[]> = {
  q_status: ['q_status_namoro'],
  q_a1: ['q_a1_2'],
  q_a2: ['q_a2_5'],
  'price:stg_a': ['maybe'],
  q_b1: ['q_b1_x', 'q_b1_y'],
  'price:stg_b': ['agree'],
  q_c1: ['q_c1_often'],
  q_c2: ['q_c2_b'],
  'price:stg_c': ['agree'],
};

/** Caminho sem nenhum tema relevante. */
export const CALM_PATH: Record<string, string[]> = {
  q_status: ['q_status_solteiro'],
  q_a1: ['q_a1_0'],
  q_a2: ['q_a2_5'],
  q_b1: ['q_b1_none'],
  q_c1: ['q_c1_never'],
  q_c2: [],
};
