import { describe, expect, it } from 'vitest';
import { applyRules, computeResult, sortRules, type QuizDefinition, type RuleDef } from '../src';
import { CONFLICT_PATH, COMMUNICATION_PATH, makeDefinition, runQuiz } from './fixtures';

function withRules(rules: RuleDef[]): QuizDefinition {
  return { ...makeDefinition(), rules };
}

const always = { all: [] };

describe('regras condicionais — efeitos', () => {
  it('adiciona sinalizadores quando a condição é atendida', () => {
    const def = makeDefinition();
    expect(computeResult(def, runQuiz(def, CONFLICT_PATH)).flags).toEqual(['safety_support']);
    expect(computeResult(def, runQuiz(def, COMMUNICATION_PATH)).flags).toEqual([]);
  });

  it('aplica soma, multiplicação e recomendação no caminho de conflito', () => {
    const def = makeDefinition();
    const result = computeResult(def, runQuiz(def, CONFLICT_PATH));
    const byId = Object.fromEntries(result.scores.map((s) => [s.categoryId, s]));

    expect(result.appliedRuleIds).toEqual(['rule_flag', 'rule_boost', 'rule_half']);
    expect(byId.cat_a).toMatchObject({ baseScore: 44.4, score: 54.4 }); // +10
    expect(byId.cat_b).toMatchObject({ baseScore: 100, score: 50 }); // ×0,5
    expect(byId.cat_c).toMatchObject({ baseScore: 100, score: 100 });
    expect(result.recommendedModules.map((m) => m.moduleId)).toContain('mod_extra');
  });

  it('não aplica regras cuja condição não é atendida', () => {
    const def = makeDefinition();
    const result = computeResult(def, runQuiz(def, COMMUNICATION_PATH));
    expect(result.appliedRuleIds).toEqual([]);
    expect(result.recommendedModules.map((m) => m.moduleId)).not.toContain('mod_extra');
  });

  it('limita as pontuações entre 0 e 100', () => {
    const def = withRules([
      { id: 'r1', name: 'soma', priority: 1, condition: always, effects: [{ type: 'addScore', categoryId: 'cat_a', value: 80 }] },
      { id: 'r2', name: 'subtrai', priority: 0, condition: always, effects: [{ type: 'addScore', categoryId: 'cat_b', value: -80 }] },
    ]);
    const outcome = applyRules(def, {}, { cat_a: 50, cat_b: 50, cat_c: 0 });
    expect(outcome.scores).toEqual({ cat_a: 100, cat_b: 0, cat_c: 0 });
  });

  it('aplica os efeitos na ordem de prioridade (maior primeiro)', () => {
    const add = { type: 'addScore', categoryId: 'cat_a', value: 20 } as const;
    const half = { type: 'multiplyScore', categoryId: 'cat_a', factor: 0.5 } as const;
    const base = { cat_a: 40, cat_b: 0, cat_c: 0 };

    const addFirst = withRules([
      { id: 'add', name: 'add', priority: 10, condition: always, effects: [add] },
      { id: 'half', name: 'half', priority: 5, condition: always, effects: [half] },
    ]);
    const halfFirst = withRules([
      { id: 'add', name: 'add', priority: 5, condition: always, effects: [add] },
      { id: 'half', name: 'half', priority: 10, condition: always, effects: [half] },
    ]);

    expect(applyRules(addFirst, {}, base).scores.cat_a).toBe(30); // (40 + 20) × 0,5
    expect(applyRules(halfFirst, {}, base).scores.cat_a).toBe(40); // 40 × 0,5 + 20
  });

  it('avalia as condições sobre as pontuações base (uma regra não dispara outra)', () => {
    const def = withRules([
      { id: 'boost', name: 'boost', priority: 10, condition: always, effects: [{ type: 'addScore', categoryId: 'cat_b', value: 50 }] },
      {
        id: 'chain',
        name: 'chain',
        priority: 5,
        condition: { score: { categoryId: 'cat_b', op: 'gte', value: 50 } },
        effects: [{ type: 'addFlag', flag: 'encadeada' }],
      },
    ]);
    const outcome = applyRules(def, {}, { cat_a: 0, cat_b: 10, cat_c: 0 });
    expect(outcome.scores.cat_b).toBe(60);
    expect(outcome.flags).toEqual([]);
    expect(outcome.appliedRuleIds).toEqual(['boost']);
  });

  it('ignora com segurança efeitos que apontam para categorias ou módulos inexistentes', () => {
    const def = withRules([
      {
        id: 'r',
        name: 'órfã',
        priority: 1,
        condition: always,
        effects: [
          { type: 'addScore', categoryId: 'cat_inexistente', value: 10 },
          { type: 'recommendModule', moduleId: 'mod_inexistente' },
        ],
      },
    ]);
    const outcome = applyRules(def, {}, { cat_a: 1, cat_b: 2, cat_c: 3 });
    expect(outcome.scores).toEqual({ cat_a: 1, cat_b: 2, cat_c: 3 });
    expect(outcome.recommendedModuleIds).toEqual([]);
  });

  it('não duplica sinalizadores nem módulos recomendados', () => {
    const def = withRules([
      { id: 'a', name: 'a', priority: 2, condition: always, effects: [{ type: 'addFlag', flag: 'x' }, { type: 'recommendModule', moduleId: 'mod_a' }] },
      { id: 'b', name: 'b', priority: 1, condition: always, effects: [{ type: 'addFlag', flag: 'x' }, { type: 'recommendModule', moduleId: 'mod_a' }] },
    ]);
    const outcome = applyRules(def, {}, {});
    expect(outcome.flags).toEqual(['x']);
    expect(outcome.recommendedModuleIds).toEqual(['mod_a']);
  });

  it('ordena regras de forma determinística', () => {
    const rules = [
      { id: 'b', name: '', priority: 1, condition: always, effects: [] },
      { id: 'a', name: '', priority: 1, condition: always, effects: [] },
      { id: 'c', name: '', priority: 9, condition: always, effects: [] },
    ];
    expect(sortRules(rules).map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });
});
