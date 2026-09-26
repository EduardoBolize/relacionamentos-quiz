import { describe, expect, it } from 'vitest';
import {
  AnswerError,
  QuizEngine,
  applyAnswer,
  buildFlow,
  getNextStep,
  getProgress,
  priceStepId,
  type Answers,
} from '../src';
import { CONFLICT_PATH, COMMUNICATION_PATH, makeDefinition, runQuiz } from './fixtures';

const def = makeDefinition();
const engine = new QuizEngine(def);

function expectAnswerError(fn: () => unknown, code: AnswerError['code']) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AnswerError);
    expect((error as AnswerError).code).toBe(code);
    return;
  }
  throw new Error(`Era esperado AnswerError(${code})`);
}

describe('fluxo do quiz — ordem e etapas', () => {
  it('começa pela primeira pergunta da primeira etapa', () => {
    const step = getNextStep(def, {});
    expect(step).toMatchObject({ kind: 'question', id: 'q_status', stageId: 'stg_profile' });
  });

  it('apresenta uma pergunta por vez, na ordem, com a pergunta de valor ao final de cada etapa', () => {
    const visited: string[] = [];
    let answers: Answers = {};
    for (let step = engine.getNextStep(answers); step; step = engine.getNextStep(answers)) {
      visited.push(step.id);
      const choice = COMMUNICATION_PATH[step.id] ?? (step.kind === 'price' ? ['maybe'] : []);
      answers = engine.applyAnswer(answers, step.id, choice);
    }
    expect(visited).toEqual([
      'q_status',
      'q_a1',
      'q_a2',
      'q_a3',
      'price:stg_a',
      'q_b1',
      'q_b2',
      'price:stg_b',
      'q_c1',
      'q_c2',
    ]);
  });

  it('a etapa de perfil (sem módulo) não tem pergunta de valor', () => {
    const flow = buildFlow(def, runQuiz(def, COMMUNICATION_PATH));
    expect(flow.steps.some((s) => s.id === priceStepId('stg_profile'))).toBe(false);
  });

  it('a pergunta de valor aponta para o módulo da etapa', () => {
    const answers = runQuiz(def, { q_status: ['q_status_juntos'], q_a1: ['q_a1_0'], q_a2: ['q_a2_5'] });
    const step = buildFlow(def, answers).steps.find((s) => s.id === 'price:stg_a');
    expect(step).toMatchObject({ kind: 'price', stageId: 'stg_a', moduleId: 'mod_a' });
  });
});

describe('fluxo do quiz — adaptativo', () => {
  it('exibe perguntas condicionadas a respostas anteriores', () => {
    const withPartner = runQuiz(def, { ...COMMUNICATION_PATH, q_status: ['q_status_juntos'] });
    const single = runQuiz(def, { ...COMMUNICATION_PATH, q_status: ['q_status_solteiro'] });
    expect(buildFlow(def, withPartner).steps.map((s) => s.id)).toContain('q_b2');
    expect(buildFlow(def, single).steps.map((s) => s.id)).not.toContain('q_b2');
  });

  it('exibe perguntas condicionadas à pontuação parcial', () => {
    const high = runQuiz(def, { q_a1: ['q_a1_2'], q_a2: ['q_a2_0'] });
    const low = runQuiz(def, { q_a1: ['q_a1_0'], q_a2: ['q_a2_5'] });
    expect(buildFlow(def, high).steps.map((s) => s.id)).toContain('q_a3');
    expect(buildFlow(def, low).steps.map((s) => s.id)).not.toContain('q_a3');
  });

  it('só oferece o módulo da etapa quando o tema é relevante (pontuação mínima configurada)', () => {
    const conflict = runQuiz(def, CONFLICT_PATH);
    const calm = runQuiz(def, COMMUNICATION_PATH);
    expect(buildFlow(def, conflict).steps.map((s) => s.id)).toContain('price:stg_c');
    expect(buildFlow(def, calm).steps.map((s) => s.id)).not.toContain('price:stg_c');
  });

  it('ao mudar uma resposta anterior, ignora respostas de perguntas que deixaram de aparecer', () => {
    const answers = runQuiz(def, COMMUNICATION_PATH);
    expect(buildFlow(def, answers).effectiveAnswers.q_b2).toEqual(['q_b2_no']);

    const changed = applyAnswer(def, answers, 'q_status', ['q_status_solteiro']);
    const flow = buildFlow(def, changed);
    expect(flow.effectiveAnswers.q_b2).toBeUndefined();
    expect(engine.pruneAnswers(changed).q_b2).toBeUndefined();
    // a resposta antiga é preservada e volta a valer se a pessoa desfizer a mudança
    const restored = applyAnswer(def, changed, 'q_status', ['q_status_juntos']);
    expect(buildFlow(def, restored).effectiveAnswers.q_b2).toEqual(['q_b2_no']);
  });

  it('navega para o passo seguinte e anterior', () => {
    const answers = runQuiz(def, COMMUNICATION_PATH);
    expect(engine.getStepAfter(answers, 'q_a3')?.id).toBe('price:stg_a');
    expect(engine.getStepBefore(answers, 'q_b1')?.id).toBe('price:stg_a');
    expect(engine.getStepBefore(answers, 'q_status')).toBeNull();
    expect(engine.getStepAfter(answers, 'q_c2')).toBeNull();
    expect(engine.getStep(answers, 'q_inexistente')).toBeNull();
  });
});

describe('fluxo do quiz — validação das respostas', () => {
  it('não permite pular perguntas', () => {
    expectAnswerError(() => applyAnswer(def, {}, 'q_a1', ['q_a1_0']), 'step_out_of_order');
  });

  it('não permite responder perguntas ocultas ou inexistentes', () => {
    const answers = runQuiz(def, { ...COMMUNICATION_PATH, q_status: ['q_status_solteiro'] });
    expectAnswerError(() => applyAnswer(def, answers, 'q_b2', ['q_b2_no']), 'step_not_available');
    expectAnswerError(() => applyAnswer(def, answers, 'nao_existe', ['x']), 'step_not_available');
  });

  it('rejeita opções de outra pergunta e seleções inválidas', () => {
    expectAnswerError(() => applyAnswer(def, {}, 'q_status', ['q_a1_0']), 'invalid_option');
    expectAnswerError(() => applyAnswer(def, {}, 'q_status', []), 'selection_required');
    expectAnswerError(
      () => applyAnswer(def, {}, 'q_status', ['q_status_juntos', 'q_status_namoro']),
      'too_many_selections',
    );
  });

  it('respeita o limite de seleções da múltipla escolha', () => {
    const answers = runQuiz(def, { 'price:stg_a': ['maybe'] });
    const upToB1 = Object.fromEntries(
      Object.entries(answers).filter(([key]) => ['q_status', 'q_a1', 'q_a2', 'q_a3', 'price:stg_a'].includes(key)),
    );
    expectAnswerError(
      () => applyAnswer(def, upToB1, 'q_b1', ['q_b1_x', 'q_b1_y', 'q_b1_z']),
      'too_many_selections',
    );
    expect(applyAnswer(def, upToB1, 'q_b1', ['q_b1_x', 'q_b1_y']).q_b1).toEqual(['q_b1_x', 'q_b1_y']);
  });

  it('permite pular perguntas opcionais', () => {
    const answers = runQuiz(def, COMMUNICATION_PATH);
    expect(answers.q_c2).toEqual([]);
    expect(engine.isComplete(answers)).toBe(true);
  });

  it('a pergunta de valor aceita apenas concordo / talvez / não concordo', () => {
    const answers = runQuiz(def, { q_status: ['q_status_juntos'], q_a1: ['q_a1_0'], q_a2: ['q_a2_5'] });
    const beforePrice = { q_status: answers.q_status!, q_a1: answers.q_a1!, q_a2: answers.q_a2! };
    expectAnswerError(() => applyAnswer(def, beforePrice, 'price:stg_a', ['talvez']), 'invalid_option');
    expectAnswerError(() => applyAnswer(def, beforePrice, 'price:stg_a', ['agree', 'maybe']), 'invalid_option');
    expect(applyAnswer(def, beforePrice, 'price:stg_a', ['agree'])['price:stg_a']).toEqual(['agree']);
  });
});

describe('fluxo do quiz — progresso e conclusão', () => {
  it('mostra progresso visível por etapa até 100%', () => {
    let answers: Answers = {};
    const percents: number[] = [getProgress(def, answers).percent];
    for (let step = getNextStep(def, answers); step; step = getNextStep(def, answers)) {
      expect(engine.isComplete(answers)).toBe(false);
      answers = applyAnswer(def, answers, step.id, CONFLICT_PATH[step.id] ?? ['maybe']);
      percents.push(getProgress(def, answers).percent);
    }
    expect(percents[0]).toBe(0);
    expect(percents.slice(0, -1).every((p) => p < 100)).toBe(true);
    expect(percents.at(-1)).toBe(100);
    expect(engine.isComplete(answers)).toBe(true);
  });

  it('informa a etapa atual e o total de etapas', () => {
    const progress = getProgress(def, { q_status: ['q_status_juntos'] });
    expect(progress).toMatchObject({ stageIndex: 1, stageCount: 4, currentStageId: 'stg_a' });
    expect(getProgress(def, { q_status: ['q_status_juntos'] }, 'q_status').stageIndex).toBe(0);
  });

  it('um quiz sem respostas não está completo', () => {
    expect(engine.isComplete({})).toBe(false);
  });
});
