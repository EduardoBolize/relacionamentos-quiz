import { describe, expect, it } from 'vitest';
import {
  MAX_CONDITION_DEPTH,
  boundedConditionSchema,
  conditionDepth,
  describeCondition,
  evaluateCondition,
  parseConditionJson,
  parseEffectsJson,
  type Condition,
} from '../src';
import { makeDefinition } from './fixtures';

const ctx = {
  answers: { q1: ['a'], q2: ['b', 'c'], q3: [] as string[] },
  scores: { x: 60, y: 20 },
};

describe('regras condicionais — avaliação', () => {
  it('sem condição é sempre verdadeiro', () => {
    expect(evaluateCondition(null, ctx)).toBe(true);
    expect(evaluateCondition(undefined, ctx)).toBe(true);
  });

  it('avalia respostas selecionadas', () => {
    expect(evaluateCondition({ answer: { questionId: 'q1', op: 'selected', optionIds: ['a'] } }, ctx)).toBe(true);
    expect(evaluateCondition({ answer: { questionId: 'q2', op: 'selected', optionIds: ['x', 'c'] } }, ctx)).toBe(true);
    expect(evaluateCondition({ answer: { questionId: 'q1', op: 'selected', optionIds: ['z'] } }, ctx)).toBe(false);
  });

  it('"não selecionada" exige que a pergunta tenha sido respondida', () => {
    expect(evaluateCondition({ answer: { questionId: 'q1', op: 'notSelected', optionIds: ['z'] } }, ctx)).toBe(true);
    expect(evaluateCondition({ answer: { questionId: 'q1', op: 'notSelected', optionIds: ['a'] } }, ctx)).toBe(false);
    expect(evaluateCondition({ answer: { questionId: 'q9', op: 'notSelected', optionIds: ['a'] } }, ctx)).toBe(false);
  });

  it('avalia respondida / não respondida (lista vazia = pulou)', () => {
    expect(evaluateCondition({ answer: { questionId: 'q1', op: 'answered' } }, ctx)).toBe(true);
    expect(evaluateCondition({ answer: { questionId: 'q3', op: 'answered' } }, ctx)).toBe(false);
    expect(evaluateCondition({ answer: { questionId: 'q9', op: 'notAnswered' } }, ctx)).toBe(true);
  });

  it('avalia limites de pontuação', () => {
    const score = (op: 'gte' | 'gt' | 'lte' | 'lt', value: number): Condition => ({
      score: { categoryId: 'x', op, value },
    });
    expect(evaluateCondition(score('gte', 60), ctx)).toBe(true);
    expect(evaluateCondition(score('gt', 60), ctx)).toBe(false);
    expect(evaluateCondition(score('lte', 60), ctx)).toBe(true);
    expect(evaluateCondition(score('lt', 60), ctx)).toBe(false);
    expect(evaluateCondition({ score: { categoryId: 'inexistente', op: 'lt', value: 1 } }, ctx)).toBe(true);
  });

  it('combina com E / OU / NÃO', () => {
    const a: Condition = { answer: { questionId: 'q1', op: 'selected', optionIds: ['a'] } };
    const b: Condition = { score: { categoryId: 'y', op: 'gte', value: 50 } };
    expect(evaluateCondition({ all: [a, b] }, ctx)).toBe(false);
    expect(evaluateCondition({ any: [a, b] }, ctx)).toBe(true);
    expect(evaluateCondition({ not: b }, ctx)).toBe(true);
    expect(evaluateCondition({ all: [] }, ctx)).toBe(true);
    expect(evaluateCondition({ any: [] }, ctx)).toBe(false);
  });

  it('mede a profundidade de aninhamento', () => {
    const leaf: Condition = { answer: { questionId: 'q1', op: 'answered' } };
    expect(conditionDepth(leaf)).toBe(1);
    expect(conditionDepth({ all: [leaf, { not: { any: [leaf] } }] })).toBe(4);
  });
});

describe('regras condicionais — validação do JSON salvo pelo admin', () => {
  it('aceita condições válidas', () => {
    const json = JSON.stringify({
      all: [
        { answer: { questionId: 'q1', op: 'selected', optionIds: ['a'] } },
        { score: { categoryId: 'x', op: 'gte', value: 40 } },
      ],
    });
    expect(parseConditionJson(json)).toEqual(JSON.parse(json));
    expect(parseConditionJson('')).toBeNull();
    expect(parseConditionJson(null)).toBeNull();
  });

  it('rejeita formatos inválidos, chaves desconhecidas e valores fora da faixa', () => {
    expect(() => parseConditionJson('{"answer":{"questionId":"q1","op":"igual"}}')).toThrow();
    expect(() => parseConditionJson('{"answer":{"questionId":"q1","op":"answered"},"extra":1}')).toThrow();
    expect(() => parseConditionJson('{"score":{"categoryId":"x","op":"gte","value":150}}')).toThrow();
    expect(() => parseConditionJson('não é json')).toThrow();
  });

  it('rejeita condições profundas demais', () => {
    let deep: Condition = { answer: { questionId: 'q1', op: 'answered' } };
    for (let i = 0; i < MAX_CONDITION_DEPTH; i += 1) deep = { not: deep };
    expect(boundedConditionSchema.safeParse(deep).success).toBe(false);
  });

  it('valida os efeitos das regras', () => {
    expect(parseEffectsJson('[{"type":"addScore","categoryId":"x","value":10}]')).toHaveLength(1);
    expect(() => parseEffectsJson('[]')).toThrow();
    expect(() => parseEffectsJson('[{"type":"deleteDatabase"}]')).toThrow();
    expect(() => parseEffectsJson('[{"type":"addFlag","flag":"Com Espaço"}]')).toThrow();
  });
});

describe('regras condicionais — descrição legível', () => {
  it('descreve condições com os textos das perguntas e categorias', () => {
    const def = makeDefinition();
    const text = describeCondition(
      {
        all: [
          { answer: { questionId: 'q_status', op: 'selected', optionIds: ['q_status_juntos'] } },
          { score: { categoryId: 'cat_a', op: 'gte', value: 50 } },
        ],
      },
      def,
    );
    expect(text).toBe('“Pergunta q_status” = “q_status_juntos” E Pontuação de Comunicação ≥ 50');
    expect(describeCondition(null, def)).toBe('Sempre');
  });
});
