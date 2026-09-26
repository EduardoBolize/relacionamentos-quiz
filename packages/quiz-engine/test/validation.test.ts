import { describe, expect, it } from 'vitest';
import { validateDefinition, type QuizDefinition } from '../src';
import { makeDefinition, opt, question } from './fixtures';

const codes = (def: QuizDefinition) => validateDefinition(def).map((issue) => `${issue.level}:${issue.code}`);

describe('validação da configuração do quiz', () => {
  it('a definição de teste não tem erros (apenas o aviso do módulo sem categoria)', () => {
    expect(codes(makeDefinition())).toEqual(['warning:module_without_category']);
  });

  it('acusa pesos para categorias inexistentes', () => {
    const def = makeDefinition();
    def.stages[1]!.questions[0]!.options[1]!.weights = { cat_fantasma: 2 };
    expect(codes(def)).toContain('error:weight_unknown_category');
  });

  it('acusa condições com perguntas/opções inexistentes e referências a perguntas posteriores', () => {
    const def = makeDefinition();
    def.stages[1]!.questions[0]!.condition = {
      answer: { questionId: 'q_nao_existe', op: 'answered' },
    };
    def.stages[1]!.questions[1]!.condition = {
      answer: { questionId: 'q_c1', op: 'selected', optionIds: ['q_c1_often'] },
    };
    def.stages[2]!.questions[0]!.condition = {
      answer: { questionId: 'q_status', op: 'selected', optionIds: ['q_a1_0'] },
    };
    const found = codes(def);
    expect(found).toContain('error:condition_unknown_question');
    expect(found).toContain('warning:condition_forward_reference');
    expect(found).toContain('error:condition_unknown_option');
  });

  it('acusa etapas oferecendo módulos inexistentes e regras apontando para itens inexistentes', () => {
    const def = makeDefinition();
    def.stages[1]!.offer = { moduleId: 'mod_fantasma', priceQuestionEnabled: true, minScore: 0 };
    def.rules.push({
      id: 'r',
      name: 'órfã',
      priority: 0,
      condition: { score: { categoryId: 'cat_fantasma', op: 'gte', value: 1 } },
      effects: [{ type: 'recommendModule', moduleId: 'mod_fantasma' }],
    });
    const found = codes(def);
    expect(found).toContain('error:stage_unknown_module');
    expect(found).toContain('error:rule_unknown_module');
    expect(found).toContain('error:condition_unknown_category');
  });

  it('acusa perguntas com menos de duas opções e etapas sem perguntas', () => {
    const def = makeDefinition();
    def.stages[1]!.questions.push(question('q_unica', 'stg_a', [opt('so_uma')]));
    def.stages.push({ id: 'stg_vazia', title: 'Vazia', description: '', questions: [] });
    const found = codes(def);
    expect(found).toContain('error:question_few_options');
    expect(found).toContain('warning:stage_without_questions');
  });

  it('avisa sobre categorias que nunca pontuam e limites incoerentes', () => {
    const def = makeDefinition();
    def.categories.push({
      id: 'cat_nova',
      slug: 'nova',
      name: 'Nova',
      shortDescription: '',
      explanation: '',
      color: '#fff',
      position: 9,
    });
    def.settings = { primaryMinScore: 20, secondaryMinScore: 40, maxSecondary: 2 };
    const found = codes(def);
    expect(found).toContain('warning:category_without_weights');
    expect(found).toContain('warning:category_without_module');
    expect(found).toContain('warning:settings_secondary_above_primary');
  });
});
