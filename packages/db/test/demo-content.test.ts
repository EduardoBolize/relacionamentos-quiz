import { describe, expect, it } from 'vitest';
import { QuizEngine, SAFETY_FLAG, validateDefinition, type Answers, type QuizDefinition } from '@relacionamentos/quiz-engine';
import { demoCategories, demoModules, demoRules, demoSettings, demoStages } from '../seed/demo-content';

/** Converte o conteúdo de demonstração na definição usada pelo motor (sem precisar de banco). */
function demoDefinition(): QuizDefinition {
  return {
    categories: demoCategories.map((category, position) => ({ ...category, position })),
    stages: demoStages.map((stage) => ({
      id: stage.id,
      title: stage.title,
      description: stage.description,
      condition: null,
      offer: stage.offerModuleId
        ? {
            moduleId: stage.offerModuleId,
            priceQuestionEnabled: stage.priceQuestionEnabled ?? true,
            minScore: stage.priceQuestionMinScore ?? 0,
          }
        : null,
      questions: stage.questions.map((question) => ({
        id: question.id,
        stageId: stage.id,
        text: question.text,
        helpText: question.helpText ?? null,
        type: question.type,
        required: question.required ?? true,
        maxSelections: question.maxSelections ?? null,
        scaleMinLabel: question.scaleMinLabel ?? null,
        scaleMaxLabel: question.scaleMaxLabel ?? null,
        condition: question.condition ?? null,
        options: question.options.map((option) => ({ id: option.id, label: option.label, weights: option.weights ?? {} })),
      })),
    })),
    modules: demoModules.map((module, position) => ({
      id: module.id,
      slug: module.slug,
      title: module.title,
      subtitle: module.subtitle,
      description: module.description,
      priceCents: module.priceCents,
      categoryIds: module.categoryIds,
      position,
    })),
    rules: demoRules.map(({ id, name, priority, condition, effects }) => ({ id, name, priority, condition, effects })),
    settings: demoSettings.engine,
  };
}

/** Responde o quiz; perguntas sem escolha explícita recebem a opção "tranquila" (sem pesos). */
function run(engine: QuizEngine, choices: Record<string, string[]>): { answers: Answers; visited: string[] } {
  let answers: Answers = {};
  const visited: string[] = [];
  for (let step = engine.getNextStep(answers); step; step = engine.getNextStep(answers)) {
    visited.push(step.id);
    const fallback =
      step.kind === 'price'
        ? ['maybe']
        : [(step.question.options.find((o) => Object.keys(o.weights).length === 0) ?? step.question.options[0]!).id];
    answers = engine.applyAnswer(answers, step.id, choices[step.id] ?? fallback);
  }
  return { answers, visited };
}

const engine = new QuizEngine(demoDefinition());

describe('conteúdo de demonstração', () => {
  it('é uma configuração válida, sem erros nem avisos', () => {
    expect(validateDefinition(engine.definition)).toEqual([]);
  });

  it('tem uma pergunta de valor ao final de cada etapa ligada a um módulo', () => {
    const { visited } = run(engine, {});
    const priceSteps = visited.filter((id) => id.startsWith('price:'));
    expect(priceSteps).toEqual(demoStages.filter((s) => s.offerModuleId).map((s) => `price:${s.id}`));
  });

  it('destaca Comunicação para quem sente que não é ouvido(a)', () => {
    const { answers, visited } = run(engine, {
      q_motivo: ['opt_motivo_ouvido'],
      q_com_incomodo: ['opt_com_inc_naoouvido'],
      q_com_escuta: ['opt_com_esc_1'],
      q_com_evitados: ['opt_com_evit_varios'],
      'price:stg_comunicacao': ['agree'],
    });
    expect(visited).toContain('q_com_evitados'); // pergunta adaptativa por pontuação
    const result = engine.computeResult(answers);
    expect(result.primary?.categoryId).toBe('cat_comunicacao');
    expect(result.recommendedModules[0]).toMatchObject({ moduleId: 'mod_comunicacao', preselected: true });
    expect(result.flags).toEqual([]);
  });

  it('mostra canais de apoio quando há medo das reações do outro', () => {
    const { answers } = run(engine, { q_confl_medo: ['opt_confl_medo_frequente'] });
    expect(engine.computeResult(answers).flags).toContain(SAFETY_FLAG);
  });

  it('pergunta de controle só aparece quando o ciúme é frequente', () => {
    expect(run(engine, {}).visited).not.toContain('q_conf_controle');
    expect(run(engine, { q_conf_ciume: ['opt_conf_ciume_sempre'] }).visited).toContain('q_conf_controle');
  });

  it('pula perguntas de finanças compartilhadas para quem não divide despesas', () => {
    const separate = run(engine, { q_fin_divisao: ['opt_fin_div_separado'] }).visited;
    const shared = run(engine, { q_fin_divisao: ['opt_fin_div_tudo'] }).visited;
    expect(separate).not.toContain('q_fin_tensao');
    expect(shared).toEqual(expect.arrayContaining(['q_fin_tensao', 'q_fin_transparencia']));
  });

  it('não aponta tema principal quando as respostas são tranquilas', () => {
    const { answers } = run(engine, {});
    const result = engine.computeResult(answers);
    expect(result.primary).toBeNull();
    expect(result.scores.every((score) => score.score === 0)).toBe(true);
  });

  it('todos os módulos têm preço, prévia e conteúdo', () => {
    for (const module of demoModules) {
      expect(module.priceCents).toBeGreaterThan(0);
      expect(module.previewContent.length).toBeGreaterThan(100);
      expect(module.content.length).toBeGreaterThan(module.previewContent.length);
    }
  });
});
