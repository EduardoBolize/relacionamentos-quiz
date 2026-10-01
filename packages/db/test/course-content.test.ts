import { describe, expect, it } from 'vitest';
import { QuizEngine, SAFETY_FLAG, validateDefinition, type Answers, type QuizDefinition } from '@relacionamentos/quiz-engine';
import { courseCategories, courseModules, courseObjections, courseRules, courseSettings, courseStages } from '../seed/content';

/** Converte o conteúdo do curso na definição usada pelo motor (sem precisar de banco). */
function courseDefinition(): QuizDefinition {
  return {
    categories: courseCategories.map((category, position) => ({ ...category, position })),
    stages: courseStages.map((stage) => ({
      id: stage.id,
      title: stage.title,
      description: stage.description,
      condition: stage.condition ?? null,
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
    modules: courseModules.map((module, position) => ({
      id: module.id,
      slug: module.slug,
      title: module.title,
      subtitle: module.subtitle,
      description: module.description,
      priceCents: module.priceCents,
      categoryIds: module.categoryIds,
      position,
    })),
    rules: courseRules.map(({ id, name, priority, condition, effects }) => ({ id, name, priority, condition, effects })),
    settings: courseSettings.engine,
  };
}

/** Responde o quiz; perguntas sem escolha explícita recebem a primeira opção "tranquila" (sem pesos). */
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

const engine = new QuizEngine(courseDefinition());
const resultOf = (choices: Record<string, string[]>) => engine.computeResult(run(engine, choices).answers);
const bestModule = (choices: Record<string, string[]>) => resultOf(choices).recommendedModules[0]?.moduleId;

describe('conteúdo do curso Fórmula do Amor', () => {
  it('é uma configuração válida, sem erros nem avisos', () => {
    expect(validateDefinition(engine.definition)).toEqual([]);
  });

  it('tem 8 módulos de R$ 15, somando o valor cheio de R$ 120', () => {
    expect(courseModules).toHaveLength(8);
    expect(courseModules.every((module) => module.priceCents === 1500)).toBe(true);
    expect(courseModules.reduce((sum, module) => sum + module.priceCents, 0)).toBe(12_000);
    expect(courseSettings.pricing.comboDiscountPercent).toBe(0);
  });

  it('cada módulo tem texto, prévia e 3 aulas em vídeo de cerca de 1 minuto', () => {
    for (const module of courseModules) {
      expect(module.previewContent.length).toBeGreaterThan(300);
      expect(module.content.length).toBeGreaterThan(module.previewContent.length * 4);
      expect(module.videos).toHaveLength(3);
      expect(module.videos.filter((video) => video.isPreview)).toHaveLength(1);
      for (const video of module.videos) {
        const words = video.script.split(/\s+/).filter(Boolean).length;
        // ~150 palavras por minuto de narração
        expect(words, `${module.slug}: ${video.title}`).toBeGreaterThanOrEqual(110);
        expect(words, `${module.slug}: ${video.title}`).toBeLessThanOrEqual(175);
        expect(video.durationSeconds).toBeGreaterThanOrEqual(55);
        expect(video.durationSeconds).toBeLessThanOrEqual(75);
        expect(video.keyPoints.split('\n').filter(Boolean).length).toBeGreaterThanOrEqual(3);
      }
    }
    const ids = courseModules.flatMap((module) => module.videos.map((video) => video.id));
    expect(new Set(ids).size).toBe(24);
  });

  it('cada módulo tem uma categoria própria e uma etapa do quiz que termina com a pergunta de valor', () => {
    for (const module of courseModules) {
      expect(module.categoryIds).toHaveLength(1);
      expect(courseStages.filter((stage) => stage.offerModuleId === module.id)).toHaveLength(1);
    }
  });

  it('é adaptativo: só aparecem as etapas do momento e dos desafios escolhidos', () => {
    const { visited } = run(engine, {
      q_momento: ['opt_momento_crush'],
      q_desafio: ['opt_desafio_atrair'],
    });
    const stages = new Set(visited.map((id) => engine.definition.stages.find((s) => s.questions.some((q) => q.id === id) || `price:${s.id}` === id)?.id));
    expect([...stages]).toEqual(['stg_momento', 'stg_voce', 'stg_conquista', 'stg_comeco']);
    expect(visited).not.toContain('q_seguranca'); // pergunta de segurança só para quem está (ou esteve) em uma relação
    expect(visited.filter((id) => id.startsWith('price:'))).toEqual(['price:stg_voce', 'price:stg_conquista']);
    expect(visited.length).toBeLessThanOrEqual(13);
  });

  it('pergunta de app só aparece para quem conhece pessoas online', () => {
    const base = { q_momento: ['opt_momento_solteira'], q_desafio: ['opt_desafio_atrair'] };
    expect(run(engine, base).visited).not.toContain('q_conq_online');
    expect(run(engine, { ...base, q_conq_onde: ['opt_onde_apps'] }).visited).toContain('q_conq_online');
  });

  it('crush com dificuldade de atrair → A Arte da Conquista', () => {
    expect(
      bestModule({
        q_momento: ['opt_momento_crush'],
        q_desafio: ['opt_desafio_atrair'],
        q_conq_postura: ['opt_postura_elogios'],
        'price:stg_conquista': ['agree'],
      }),
    ).toBe('mod_conquista');
  });

  it('ex que quer voltar por medo do vazio → primeiro Comece por Você, depois Depois do Término', () => {
    const result = resultOf({
      q_momento: ['opt_momento_ex'],
      q_desafio: ['opt_desafio_saudade', 'opt_desafio_inseguranca'],
      q_ajuda: ['opt_ajuda_vergonha'],
      q_valor: ['opt_valor_1'],
      q_fachada: ['opt_fachada_anular'],
      q_term_quando: ['opt_quando_recente'],
      q_term_motivo: ['opt_motivo_vazio'],
      q_term_contato: ['opt_contato_frio'],
    });
    expect(result.primary?.categoryId).toBe('cat_amor_proprio');
    expect(result.recommendedModules.map((m) => m.moduleId).slice(0, 2)).toEqual(['mod_amor_proprio', 'mod_termino']);
    expect(result.flags).toContain('objecao_vergonha');
  });

  it('namorando com rotina morna → Romance e Surpresas, com Amor que Dura entre as indicações', () => {
    const result = resultOf({
      q_momento: ['opt_momento_namorando'],
      q_desafio: ['opt_desafio_rotina'],
      q_rom_clima: ['opt_clima_morno'],
      q_rom_ideias: ['opt_ideias_faltam'],
      q_comp_fase: ['opt_fase_rotina'],
    });
    expect(result.primary?.categoryId).toBe('cat_romance');
    expect(result.recommendedModules.map((m) => m.moduleId)).toEqual(expect.arrayContaining(['mod_romance', 'mod_compromisso']));
  });

  it('casada em crise, com conversas que viram briga → Conversas que Aproximam e Quando a Relação Balança', () => {
    const result = resultOf({
      q_momento: ['opt_momento_casada'],
      q_desafio: ['opt_desafio_brigas', 'opt_desafio_conversa'],
      q_conv_assunto: ['opt_assunto_discussao'],
      q_conv_escuta: ['opt_escuta_1'],
      q_conv_sentimentos: ['opt_sentimentos_dificil'],
      q_crise_problema: ['opt_problema_semconversa'],
      q_crise_sentimento: ['opt_sentimento_ambos'],
      q_crise_desculpas: ['opt_desculpas_orgulho'],
    });
    const ids = result.recommendedModules.map((m) => m.moduleId);
    expect(result.primary?.categoryId).toBe('cat_comunicacao');
    expect(ids).toEqual(expect.arrayContaining(['mod_conversas', 'mod_crise', 'mod_compromisso']));
  });

  it('ciúme vindo de palpites → Confiança sem Paranoia', () => {
    expect(
      bestModule({
        q_momento: ['opt_momento_namorando'],
        q_desafio: ['opt_desafio_ciume'],
        q_conf_frequencia: ['opt_frequencia_frequente'],
        q_conf_origem: ['opt_origem_palpite'],
      }),
    ).toBe('mod_confianca');
  });

  it('sente que o término está perto → módulo de crise', () => {
    const result = resultOf({
      q_momento: ['opt_momento_namorando'],
      q_desafio: ['opt_desafio_saudade'],
      q_term_quando: ['opt_quando_naoterminamos'],
    });
    expect(result.recommendedModules.map((m) => m.moduleId)).toContain('mod_crise');
  });

  it('sem tema forte, ainda indica o módulo do momento da pessoa', () => {
    const result = resultOf({ q_momento: ['opt_momento_casada'], q_desafio: ['opt_desafio_futuro'] });
    expect(result.recommendedModules.map((m) => m.moduleId)).toContain('mod_compromisso');
  });

  it('medo, humilhação ou agressão mostram canais de apoio e priorizam o amor-próprio', () => {
    const result = resultOf({
      q_momento: ['opt_momento_ex'],
      q_desafio: ['opt_desafio_saudade'],
      q_seguranca: ['opt_seguranca_frequente'],
    });
    expect(result.flags).toContain(SAFETY_FLAG);
    expect(result.recommendedModules.map((m) => m.moduleId)).toContain('mod_amor_proprio');
  });

  it('as dúvidas da última etapa viram respostas às objeções', () => {
    const result = resultOf({
      q_momento: ['opt_momento_solteira'],
      q_desafio: ['opt_desafio_atrair'],
      q_ajuda: ['opt_ajuda_decepcao'],
      q_tempo_dia: ['opt_tempo_5'],
      q_para_comecar: ['opt_comecar_preco'],
    });
    expect(result.flags).toEqual(expect.arrayContaining(['objecao_desconfianca', 'objecao_tempo', 'objecao_preco']));
  });

  it('todo sinalizador de objeção usado nas regras tem uma resposta cadastrada (e vice-versa)', () => {
    const flags = new Set(
      courseRules.flatMap((rule) => rule.effects.flatMap((effect) => (effect.type === 'addFlag' ? [effect.flag] : []))),
    );
    flags.delete(SAFETY_FLAG);
    expect([...flags].sort()).toEqual(courseObjections.map((objection) => objection.flag).sort());
    for (const objection of courseObjections) {
      const placeholders = objection.answer.match(/\{[a-z_]+\}/g) ?? [];
      for (const placeholder of placeholders) {
        expect(['{preco_modulo}', '{preco_curso}', '{parcelas}', '{modulos}', '{garantia_dias}']).toContain(placeholder);
      }
    }
  });
});
