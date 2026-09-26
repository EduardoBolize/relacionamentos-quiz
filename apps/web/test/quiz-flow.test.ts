import { AnswerError } from '@relacionamentos/quiz-engine';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/server/db';
import { getEngine, invalidateQuizDefinition } from '@/server/definition';
import { HttpError } from '@/server/http';
import { resetRateLimits } from '@/server/security/rate-limit';
import { answerQuizStep, buildQuizState, createQuizSession, parseAnswers } from '@/server/services/quiz-service';
import { CONFLICT_CHOICES, playQuiz, reloadSession } from './helpers';

beforeEach(() => {
  resetRateLimits();
  invalidateQuizDefinition();
});

describe('fluxo do quiz (serviços usados pelas rotas de API)', () => {
  it('começa na primeira pergunta, com progresso zerado e sem expor pesos', async () => {
    const engine = await getEngine();
    const { session, token } = await createQuizSession();
    const state = await buildQuizState(engine, session, token);

    expect(state.status).toBe('in_progress');
    if (state.status !== 'in_progress') return;
    expect(state.step).toMatchObject({ id: 'q_status', kind: 'question', isFirst: true, selected: [] });
    expect(state.step.stage).toMatchObject({ index: 0, count: 7, title: 'Seu momento' });
    expect(state.progress.percent).toBe(0);
    expect(JSON.stringify(state)).not.toContain('weights');
  });

  it('apresenta a pergunta de concordância com o valor ao final de cada etapa com módulo', async () => {
    const { visited, state } = await playQuiz();
    expect(state.status).toBe('completed');
    expect(visited.filter((id) => id.startsWith('price:'))).toEqual([
      'price:stg_comunicacao',
      'price:stg_confianca',
      'price:stg_conflitos',
      'price:stg_intimidade',
      'price:stg_financas',
      'price:stg_limites',
    ]);
  });

  it('a etapa de preço mostra o módulo e o valor atual cadastrado', async () => {
    const { token } = await playQuiz({}, { stopAfter: 5 });
    const engine = await getEngine();
    const state = await buildQuizState(engine, await reloadSession(token), token);
    expect(state.status).toBe('in_progress');
    if (state.status !== 'in_progress') return;
    expect(state.step.kind).toBe('price');
    expect(state.step.module).toMatchObject({ slug: 'comunicacao-que-aproxima', priceCents: 2990 });
    expect(state.step.module?.highlights.length).toBeGreaterThan(0);
    expect(state.step.options.map((o) => o.id)).toEqual(['agree', 'maybe', 'disagree']);
  });

  it('é adaptativo: perguntas aparecem conforme respostas anteriores', async () => {
    const calm = await playQuiz();
    const jealous = await playQuiz({ q_conf_ciume: ['opt_conf_ciume_sempre'], q_fin_divisao: ['opt_fin_div_tudo'] });
    expect(calm.visited).not.toContain('q_conf_controle');
    expect(calm.visited).not.toContain('q_fin_tensao');
    expect(jealous.visited).toContain('q_conf_controle');
    expect(jealous.visited).toContain('q_fin_tensao');
  });

  it('retoma de onde parou (recuperação de sessão em andamento)', async () => {
    const { token, visited } = await playQuiz({}, { stopAfter: 3 });
    const engine = await getEngine();
    const resumed = await buildQuizState(engine, await reloadSession(token), token);
    expect(resumed.status).toBe('in_progress');
    if (resumed.status !== 'in_progress') return;
    expect(visited).toEqual(['q_status', 'q_tempo', 'q_motivo']);
    expect(resumed.step.id).toBe('q_com_incomodo');
  });

  it('permite voltar e mostra a resposta dada anteriormente', async () => {
    const { token } = await playQuiz({ q_tempo: ['opt_tempo_3a7'] }, { stopAfter: 3 });
    const engine = await getEngine();
    const previous = await buildQuizState(engine, await reloadSession(token), token, { at: 'q_motivo', direction: 'prev' });
    expect(previous.status).toBe('in_progress');
    if (previous.status !== 'in_progress') return;
    expect(previous.step.id).toBe('q_tempo');
    expect(previous.step.selected).toEqual(['opt_tempo_3a7']);
  });

  it('rejeita opções inválidas e respostas fora de ordem', async () => {
    const engine = await getEngine();
    const { session, token } = await createQuizSession();
    await expect(answerQuizStep(engine, session.id, token, { stepId: 'q_status', optionIds: ['opt_inexistente'] }, false)).rejects.toBeInstanceOf(AnswerError);
    await expect(answerQuizStep(engine, session.id, token, { stepId: 'q_limites', optionIds: [] }, false)).rejects.toMatchObject({
      code: 'step_not_available',
    });
    await expect(answerQuizStep(engine, session.id, token, { stepId: 'q_tempo', optionIds: ['opt_tempo_1a3'] }, false)).rejects.toMatchObject({
      code: 'step_out_of_order',
    });
  });

  it('conclui, congela o resultado e bloqueia novas respostas', async () => {
    const { token, sessionId, state } = await playQuiz(CONFLICT_CHOICES);
    expect(state).toMatchObject({ status: 'completed', resultPath: `/resultado/${token}` });

    const session = await db().quizSession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(session.status).toBe('completed');
    expect(session.primaryCategoryId).toBe('cat_conflitos');
    const result = JSON.parse(session.resultJson!);
    expect(result.flags).toContain('safety_support');
    expect(result.recommendedModules[0]).toMatchObject({ moduleId: 'mod_conflitos', priceAgreement: 'agree', preselected: true });

    const engine = await getEngine();
    await expect(answerQuizStep(engine, sessionId, token, { stepId: 'q_status', optionIds: ['opt_status_namoro'] }, false)).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it('ao concluir, guarda apenas as respostas das perguntas que ficaram visíveis', async () => {
    const engine = await getEngine();
    const { session, token } = await createQuizSession();
    // Responde a pergunta condicional e depois muda a resposta que a tornava visível.
    let state = await buildQuizState(engine, session, token);
    const choices: Record<string, string[]> = { q_conf_ciume: ['opt_conf_ciume_sempre'], q_conf_controle: ['opt_conf_ctrl_asvezes'] };
    while (state.status === 'in_progress' && state.step.id !== 'price:stg_confianca') {
      const { step } = state;
      const optionIds =
        choices[step.id] ??
        [engine.definition.stages.flatMap((s) => s.questions).find((q) => q.id === step.id)?.options.find((o) => !Object.keys(o.weights).length)?.id ??
          'maybe'];
      state = await answerQuizStep(engine, session.id, token, { stepId: step.id, optionIds }, false);
    }
    await answerQuizStep(engine, session.id, token, { stepId: 'q_conf_ciume', optionIds: ['opt_conf_ciume_nunca'] }, false);
    const answersBefore = parseAnswers((await reloadSession(token)).answersJson);
    expect(answersBefore.q_conf_controle).toBeDefined(); // guardada (pode voltar a valer)

    // termina o quiz
    let current = await buildQuizState(engine, await reloadSession(token), token);
    while (current.status === 'in_progress') {
      const { step } = current;
      const optionIds = step.kind === 'price' ? ['maybe'] : [step.options[0]!.id];
      current = await answerQuizStep(engine, session.id, token, { stepId: step.id, optionIds }, false);
    }
    const finalAnswers = parseAnswers((await reloadSession(token)).answersJson);
    expect(finalAnswers.q_conf_controle).toBeUndefined();
  });
});
