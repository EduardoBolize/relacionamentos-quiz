import { describe, expect, it } from 'vitest';
import {
  QuizEngine,
  ScoreAccumulator,
  answerContribution,
  computeResult,
  questionMaxContribution,
} from '../src';
import { makeDefinition, opt, question, runQuiz, COMMUNICATION_PATH } from './fixtures';

describe('pontuação — contribuição das perguntas', () => {
  it('usa o maior peso positivo em perguntas de escolha única', () => {
    const q = question('q', 's', [opt('a', { x: 1 }), opt('b', { x: 4 }), opt('c', { x: -2 })]);
    expect(questionMaxContribution(q, 'x')).toBe(4);
  });

  it('soma os maiores pesos em múltipla escolha, respeitando o limite de seleções', () => {
    const options = [opt('a', { x: 3 }), opt('b', { x: 2 }), opt('c', { x: 1 })];
    expect(questionMaxContribution(question('q', 's', options, { type: 'multiple' }), 'x')).toBe(6);
    expect(
      questionMaxContribution(question('q', 's', options, { type: 'multiple', maxSelections: 2 }), 'x'),
    ).toBe(5);
  });

  it('retorna zero quando a pergunta não pontua a categoria', () => {
    const q = question('q', 's', [opt('a'), opt('b', { y: 3 })]);
    expect(questionMaxContribution(q, 'x')).toBe(0);
  });

  it('soma os pesos das opções escolhidas (inclusive negativos)', () => {
    const q = question('q', 's', [opt('a', { x: 3 }), opt('b', { x: -1 }), opt('c', { x: 2 })], {
      type: 'multiple',
    });
    expect(answerContribution(q, ['a', 'b'], 'x')).toBe(2);
    expect(answerContribution(q, ['c'], 'y')).toBe(0);
  });
});

describe('pontuação — normalização', () => {
  it('normaliza pelas perguntas respondidas (0–100)', () => {
    const acc = new ScoreAccumulator(['x']);
    acc.add(question('q1', 's', [opt('a'), opt('b', { x: 2 }), opt('c', { x: 4 })]), ['b']);
    expect(acc.rawOf('x')).toBe(2);
    expect(acc.maxOf('x')).toBe(4);
    expect(acc.normalized('x')).toBe(50);
  });

  it('não deixa uma categoria dominar só por ter mais perguntas', () => {
    const acc = new ScoreAccumulator(['muitas', 'uma']);
    const many = question('q1', 's', [opt('a', { muitas: 1 }), opt('b', { muitas: 4 })]);
    acc.add(many, ['a']);
    acc.add({ ...many, id: 'q2' }, ['a']);
    acc.add({ ...many, id: 'q3' }, ['a']);
    acc.add(question('q4', 's', [opt('a'), opt('b', { uma: 2 })]), ['b']);
    expect(acc.rawOf('muitas')).toBe(3);
    expect(acc.normalized('muitas')).toBe(25);
    expect(acc.normalized('uma')).toBe(100);
  });

  it('limita a pontuação entre 0 e 100 quando há pesos negativos', () => {
    const acc = new ScoreAccumulator(['x']);
    acc.add(question('q', 's', [opt('a', { x: -3 }), opt('b', { x: 2 })]), ['a']);
    expect(acc.normalized('x')).toBe(0);
  });

  it('retorna zero para categoria sem perguntas respondidas', () => {
    const acc = new ScoreAccumulator(['x']);
    expect(acc.normalized('x')).toBe(0);
    expect(acc.snapshot()).toEqual({ x: 0 });
  });
});

describe('pontuação — resultado do quiz', () => {
  it('calcula as pontuações esperadas no caminho de Comunicação', () => {
    const def = makeDefinition();
    const result = computeResult(def, runQuiz(def, COMMUNICATION_PATH));
    const byId = Object.fromEntries(result.scores.map((s) => [s.categoryId, s]));

    // cat_a: q_a1 (4/4) + q_a2 (5/5) + q_a3 (3/3) = 12/12
    expect(byId.cat_a).toMatchObject({ raw: 12, max: 12, baseScore: 100, score: 100 });
    // cat_b: q_b1 z (1 de 5) + q_b2 não (0 de 2) = 1/7
    expect(byId.cat_b).toMatchObject({ raw: 1, max: 7, baseScore: 14.3 });
    // cat_c: q_a1 (1/1) + q_b1 (0/1) + q_c1 (0/4) = 1/6; q_c2 foi pulada
    expect(byId.cat_c).toMatchObject({ raw: 1, max: 6, baseScore: 16.7 });
  });

  it('ordena as categorias por pontuação, depois pontos brutos e posição', () => {
    const def = makeDefinition();
    const result = computeResult(def, runQuiz(def, COMMUNICATION_PATH));
    expect(result.scores.map((s) => s.categoryId)).toEqual(['cat_a', 'cat_c', 'cat_b']);

    const tie = computeResult(def, {});
    expect(tie.scores.map((s) => s.categoryId)).toEqual(['cat_a', 'cat_b', 'cat_c']);
  });

  it('ignora respostas com opções inexistentes (ex.: opção removida no admin)', () => {
    const def = makeDefinition();
    const engine = new QuizEngine(def);
    const answers = { ...runQuiz(def, COMMUNICATION_PATH), q_a1: ['opcao_removida'] };
    expect(engine.isComplete(answers)).toBe(false);
    expect(engine.getNextStep(answers)?.id).toBe('q_a1');
  });
});
