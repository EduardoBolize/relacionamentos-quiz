import { describe, expect, it } from 'vitest';
import { ENGINE_VERSION, QuizEngine, SAFETY_FLAG, computeResult } from '../src';
import { CALM_PATH, CONFLICT_PATH, COMMUNICATION_PATH, makeDefinition, runQuiz } from './fixtures';

describe('QuizEngine — recomendação', () => {
  it('retorna categoria principal, secundárias, pontuações e módulos (caminho de conflito)', () => {
    const engine = new QuizEngine(makeDefinition());
    const result = engine.computeResult(runQuiz(engine.definition, CONFLICT_PATH));

    expect(result.engineVersion).toBe(ENGINE_VERSION);
    expect(result.primary?.categoryId).toBe('cat_c');
    expect(result.secondary.map((s) => s.categoryId)).toEqual(['cat_a', 'cat_b']);
    expect(result.scores.map((s) => s.categoryId)).toEqual(['cat_c', 'cat_a', 'cat_b']);
    expect(result.flags).toContain(SAFETY_FLAG);
    expect(result.recommendedModules).toEqual([
      { moduleId: 'mod_c', reason: 'primary', categoryId: 'cat_c', priceAgreement: 'agree', preselected: true },
      { moduleId: 'mod_a', reason: 'secondary', categoryId: 'cat_a', priceAgreement: 'maybe', preselected: false },
      { moduleId: 'mod_b', reason: 'secondary', categoryId: 'cat_b', priceAgreement: 'agree', preselected: true },
      { moduleId: 'mod_extra', reason: 'rule', preselected: false },
    ]);
  });

  it('coleta a concordância com o valor de cada seção do livro', () => {
    const def = makeDefinition();
    expect(computeResult(def, runQuiz(def, COMMUNICATION_PATH)).priceAgreements).toEqual({
      mod_a: 'agree',
      mod_b: 'disagree',
    });
    expect(computeResult(def, runQuiz(def, CONFLICT_PATH)).priceAgreements).toEqual({
      mod_a: 'maybe',
      mod_b: 'agree',
      mod_c: 'agree',
    });
  });

  it('não sugere módulos cujo valor a pessoa recusou, a menos que sejam do tema principal/secundário', () => {
    const def = makeDefinition();
    const result = computeResult(def, runQuiz(def, COMMUNICATION_PATH));
    expect(result.primary?.categoryId).toBe('cat_a');
    expect(result.secondary).toEqual([]);
    expect(result.recommendedModules).toEqual([
      { moduleId: 'mod_a', reason: 'primary', categoryId: 'cat_a', priceAgreement: 'agree', preselected: true },
    ]);
  });

  it('inclui módulos com valor aceito mesmo fora dos temas em destaque', () => {
    const def = makeDefinition();
    const result = computeResult(def, runQuiz(def, { ...COMMUNICATION_PATH, 'price:stg_b': ['agree'] }));
    expect(result.recommendedModules.map((m) => [m.moduleId, m.reason])).toEqual([
      ['mod_a', 'primary'],
      ['mod_b', 'price_agreed'],
    ]);
  });

  it('pré-seleciona o módulo principal quando não houve concordância explícita (e não houve recusa)', () => {
    const def = makeDefinition();
    const maybe = computeResult(def, runQuiz(def, { ...COMMUNICATION_PATH, 'price:stg_a': ['maybe'] }));
    expect(maybe.recommendedModules[0]).toMatchObject({ moduleId: 'mod_a', preselected: true });

    const refused = computeResult(def, runQuiz(def, { ...COMMUNICATION_PATH, 'price:stg_a': ['disagree'] }));
    expect(refused.recommendedModules[0]).toMatchObject({ moduleId: 'mod_a', preselected: false });
  });

  it('respeita o limite de temas secundários e a pontuação mínima', () => {
    const def = { ...makeDefinition(), settings: { primaryMinScore: 35, secondaryMinScore: 52, maxSecondary: 1 } };
    const result = computeResult(def, runQuiz(def, CONFLICT_PATH));
    expect(result.primary?.categoryId).toBe('cat_c');
    expect(result.secondary.map((s) => s.categoryId)).toEqual(['cat_a']);
  });

  it('perfil equilibrado: nenhum tema principal quando ninguém atinge o mínimo', () => {
    const def = makeDefinition();
    const result = computeResult(def, runQuiz(def, CALM_PATH));
    expect(result.primary).toBeNull();
    expect(result.secondary).toEqual([]);
    expect(result.recommendedModules).toEqual([]);
  });

  it('perfil equilibrado com algum sinal: sugere explorar o tema mais pontuado, sem pré-seleção', () => {
    const def = makeDefinition();
    // cat_a = (2 + 1) / (4 + 5) = 33,3 < 35
    const result = computeResult(def, runQuiz(def, { ...CALM_PATH, q_a1: ['q_a1_1'], q_a2: ['q_a2_4'] }));
    expect(result.primary).toBeNull();
    expect(result.recommendedModules).toEqual([
      { moduleId: 'mod_a', reason: 'explore', categoryId: 'cat_a', priceAgreement: 'maybe', preselected: false },
    ]);
  });

  it('o resultado depende apenas das respostas efetivas (determinístico)', () => {
    const def = makeDefinition();
    const answers = runQuiz(def, CONFLICT_PATH);
    expect(computeResult(def, answers)).toEqual(computeResult(def, { ...answers, q_b2: ['q_b2_yes'] }));
  });
});
