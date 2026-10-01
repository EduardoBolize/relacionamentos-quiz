import { AnswerError } from '@relacionamentos/quiz-engine';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/server/db';
import { getEngine, invalidateQuizDefinition } from '@/server/definition';
import { HttpError } from '@/server/http';
import { resetRateLimits } from '@/server/security/rate-limit';
import { answerQuizStep, buildQuizState, createQuizSession, parseAnswers } from '@/server/services/quiz-service';
import { BREAKUP_CHOICES, playQuiz, reloadSession } from './helpers';

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
    expect(state.step).toMatchObject({ id: 'q_momento', kind: 'question', isFirst: true, selected: [] });
    // sem respostas, só aparecem as etapas que valem para todo mundo
    expect(state.step.stage).toMatchObject({ index: 0, count: 3, title: 'Seu momento' });
    expect(state.progress.percent).toBe(0);
    expect(JSON.stringify(state)).not.toContain('weights');
  });

  it('apresenta a pergunta de concordância com o valor ao final de cada etapa com módulo', async () => {
    const { visited, state } = await playQuiz();
    expect(state.status).toBe('completed');
    expect(visited.filter((id) => id.startsWith('price:'))).toEqual(['price:stg_voce', 'price:stg_conquista']);
  });

  it('a etapa de preço mostra o módulo, as aulas em vídeo e o valor atual cadastrado', async () => {
    const { token } = await playQuiz({}, { stopAfter: 6 });
    const engine = await getEngine();
    const state = await buildQuizState(engine, await reloadSession(token), token);
    expect(state.status).toBe('in_progress');
    if (state.status !== 'in_progress') return;
    expect(state.step).toMatchObject({ id: 'price:stg_voce', kind: 'price', text: 'Você concorda com o valor deste módulo?' });
    expect(state.step.module).toMatchObject({ slug: 'comece-por-voce', priceCents: 1500 });
    expect(state.step.module?.highlights[0]).toMatch(/3 aulas em vídeo/);
    expect(state.step.module?.highlights).toHaveLength(4);
    expect(state.step.options.map((o) => o.id)).toEqual(['agree', 'maybe', 'disagree']);
  });

  it('é adaptativo: etapas e perguntas aparecem conforme o momento e os desafios', async () => {
    const single = await playQuiz();
    const breakup = await playQuiz(BREAKUP_CHOICES);
    const online = await playQuiz({ q_conq_onde: ['opt_onde_apps'] });

    expect(single.visited).toContain('q_conq_onde');
    expect(single.visited).not.toContain('q_seguranca');
    expect(single.visited).not.toContain('q_term_quando');
    expect(single.visited).not.toContain('q_conq_online');

    expect(breakup.visited).toEqual(expect.arrayContaining(['q_seguranca', 'q_term_quando', 'q_term_motivo', 'price:stg_termino']));
    expect(breakup.visited).not.toContain('q_conq_onde');
    expect(online.visited).toContain('q_conq_online');
  });

  it('retoma de onde parou (recuperação de sessão em andamento)', async () => {
    const { token, visited } = await playQuiz({}, { stopAfter: 3 });
    const engine = await getEngine();
    const resumed = await buildQuizState(engine, await reloadSession(token), token);
    expect(resumed.status).toBe('in_progress');
    if (resumed.status !== 'in_progress') return;
    expect(visited).toEqual(['q_momento', 'q_desafio', 'q_ajuda']);
    expect(resumed.step.id).toBe('q_valor');
  });

  it('permite voltar e mostra a resposta dada anteriormente', async () => {
    const { token } = await playQuiz({ q_desafio: ['opt_desafio_rotina', 'opt_desafio_ciume'] }, { stopAfter: 3 });
    const engine = await getEngine();
    const previous = await buildQuizState(engine, await reloadSession(token), token, { at: 'q_ajuda', direction: 'prev' });
    expect(previous.status).toBe('in_progress');
    if (previous.status !== 'in_progress') return;
    expect(previous.step.id).toBe('q_desafio');
    expect(previous.step.selected).toEqual(['opt_desafio_rotina', 'opt_desafio_ciume']);
  });

  it('rejeita opções inválidas, seleções acima do limite e respostas fora de ordem', async () => {
    const engine = await getEngine();
    const { session, token } = await createQuizSession();
    await expect(answerQuizStep(engine, session.id, token, { stepId: 'q_momento', optionIds: ['opt_inexistente'] }, false)).rejects.toBeInstanceOf(AnswerError);
    await expect(answerQuizStep(engine, session.id, token, { stepId: 'q_term_quando', optionIds: [] }, false)).rejects.toMatchObject({
      code: 'step_not_available',
    });
    await expect(answerQuizStep(engine, session.id, token, { stepId: 'q_desafio', optionIds: ['opt_desafio_rotina'] }, false)).rejects.toMatchObject({
      code: 'step_out_of_order',
    });
    await answerQuizStep(engine, session.id, token, { stepId: 'q_momento', optionIds: ['opt_momento_casada'] }, false);
    await expect(
      answerQuizStep(
        engine,
        session.id,
        token,
        { stepId: 'q_desafio', optionIds: ['opt_desafio_rotina', 'opt_desafio_ciume', 'opt_desafio_brigas'] },
        false,
      ),
    ).rejects.toMatchObject({ code: 'too_many_selections' });
  });

  it('conclui, congela o resultado e bloqueia novas respostas', async () => {
    const { token, sessionId, state } = await playQuiz(BREAKUP_CHOICES);
    expect(state).toMatchObject({ status: 'completed', resultPath: `/resultado/${token}` });

    const session = await db().quizSession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(session.status).toBe('completed');
    expect(session.primaryCategoryId).toBe('cat_termino');
    const result = JSON.parse(session.resultJson!);
    expect(result.flags).toContain('safety_support');
    expect(result.recommendedModules[0]).toMatchObject({ moduleId: 'mod_termino', priceAgreement: 'agree', preselected: true });
    expect(result.recommendedModules.map((m: { moduleId: string }) => m.moduleId)).toContain('mod_amor_proprio');

    const engine = await getEngine();
    await expect(answerQuizStep(engine, sessionId, token, { stepId: 'q_momento', optionIds: ['opt_momento_crush'] }, false)).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it('as respostas da última etapa geram as dúvidas (objeções) mostradas no resultado', async () => {
    const { sessionId } = await playQuiz({ q_ajuda: ['opt_ajuda_vergonha'], q_tempo_dia: ['opt_tempo_30'], q_para_comecar: ['opt_comecar_preco'] });
    const session = await db().quizSession.findUniqueOrThrow({ where: { id: sessionId } });
    const flags: string[] = JSON.parse(session.resultJson!).flags;
    expect(flags).toEqual(expect.arrayContaining(['objecao_vergonha', 'objecao_preco']));
    expect(flags).not.toContain('objecao_tempo');
  });

  it('ao concluir, guarda apenas as respostas das perguntas que ficaram visíveis', async () => {
    const engine = await getEngine();
    const { session, token } = await createQuizSession();
    // Responde a pergunta condicional e depois muda a resposta que a tornava visível.
    let state = await buildQuizState(engine, session, token);
    const choices: Record<string, string[]> = { q_conq_onde: ['opt_onde_apps'], q_conq_online: ['opt_online_rapido'] };
    while (state.status === 'in_progress' && state.step.id !== 'price:stg_conquista') {
      const { step } = state;
      const optionIds =
        choices[step.id] ??
        [engine.definition.stages.flatMap((s) => s.questions).find((q) => q.id === step.id)?.options.find((o) => !Object.keys(o.weights).length)?.id ??
          step.options[0]?.id ??
          'maybe'];
      state = await answerQuizStep(engine, session.id, token, { stepId: step.id, optionIds }, false);
    }
    await answerQuizStep(engine, session.id, token, { stepId: 'q_conq_onde', optionIds: ['opt_onde_rotina'] }, false);
    const answersBefore = parseAnswers((await reloadSession(token)).answersJson);
    expect(answersBefore.q_conq_online).toBeDefined(); // guardada (pode voltar a valer)

    // termina o quiz
    let current = await buildQuizState(engine, await reloadSession(token), token);
    while (current.status === 'in_progress') {
      const { step } = current;
      const optionIds = step.kind === 'price' ? ['maybe'] : [step.options[0]!.id];
      current = await answerQuizStep(engine, session.id, token, { stepId: step.id, optionIds }, false);
    }
    const finalAnswers = parseAnswers((await reloadSession(token)).answersJson);
    expect(finalAnswers.q_conq_online).toBeUndefined();
  });
});
