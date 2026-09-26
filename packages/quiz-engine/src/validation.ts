import { collectClauses, conditionDepth } from './conditions';
import { MAX_CONDITION_DEPTH } from './schemas';
import type { Condition, QuizDefinition } from './types';

export type IssueLevel = 'error' | 'warning';

export interface DefinitionIssue {
  level: IssueLevel;
  code: string;
  message: string;
  ref?: { type: 'category' | 'stage' | 'question' | 'module' | 'rule' | 'settings'; id: string };
}

/**
 * Verifica a consistência da configuração do quiz (exibido no painel admin).
 * Erros quebram o funcionamento esperado; avisos indicam algo provavelmente não intencional.
 */
export function validateDefinition(def: QuizDefinition): DefinitionIssue[] {
  const issues: DefinitionIssue[] = [];
  const categoryIds = new Set(def.categories.map((c) => c.id));
  const moduleIds = new Set(def.modules.map((m) => m.id));
  const questionOrder = new Map<string, number>();
  const optionOwner = new Map<string, string>();

  let order = 0;
  for (const stage of def.stages) {
    for (const question of stage.questions) {
      questionOrder.set(question.id, order++);
      for (const option of question.options) optionOwner.set(option.id, question.id);
    }
  }

  const categoryNamed = (id: string) => def.categories.find((c) => c.id === id)?.name ?? id;

  const checkCondition = (
    condition: Condition | null | undefined,
    owner: NonNullable<DefinitionIssue['ref']>,
    ownerLabel: string,
    position: number | null,
  ) => {
    if (!condition) return;
    if (conditionDepth(condition) > MAX_CONDITION_DEPTH) {
      issues.push({
        level: 'error',
        code: 'condition_too_deep',
        message: `${ownerLabel}: condição com aninhamento acima de ${MAX_CONDITION_DEPTH} níveis.`,
        ref: owner,
      });
    }
    collectClauses(condition, (clause) => {
      if ('answer' in clause) {
        const { questionId, optionIds = [], op } = clause.answer;
        if (!questionOrder.has(questionId)) {
          issues.push({
            level: 'error',
            code: 'condition_unknown_question',
            message: `${ownerLabel}: a condição usa uma pergunta que não existe ou está inativa.`,
            ref: owner,
          });
          return;
        }
        if (position !== null && (questionOrder.get(questionId) ?? 0) >= position) {
          issues.push({
            level: 'warning',
            code: 'condition_forward_reference',
            message: `${ownerLabel}: a condição depende de uma pergunta que vem depois — ela será avaliada como "não respondida".`,
            ref: owner,
          });
        }
        if ((op === 'selected' || op === 'notSelected') && optionIds.length === 0) {
          issues.push({
            level: 'error',
            code: 'condition_missing_options',
            message: `${ownerLabel}: informe ao menos uma opção na condição.`,
            ref: owner,
          });
        }
        for (const optionId of optionIds) {
          if (optionOwner.get(optionId) !== questionId) {
            issues.push({
              level: 'error',
              code: 'condition_unknown_option',
              message: `${ownerLabel}: a condição usa uma opção que não pertence à pergunta indicada.`,
              ref: owner,
            });
          }
        }
      } else if (!categoryIds.has(clause.score.categoryId)) {
        issues.push({
          level: 'error',
          code: 'condition_unknown_category',
          message: `${ownerLabel}: a condição usa uma categoria que não existe ou está inativa.`,
          ref: owner,
        });
      }
    });
  };

  // Categorias
  const weightedCategories = new Set<string>();
  for (const stage of def.stages) {
    for (const question of stage.questions) {
      for (const option of question.options) {
        for (const [categoryId, weight] of Object.entries(option.weights)) {
          if (weight !== 0) weightedCategories.add(categoryId);
        }
      }
    }
  }
  for (const category of def.categories) {
    if (!weightedCategories.has(category.id)) {
      issues.push({
        level: 'warning',
        code: 'category_without_weights',
        message: `Categoria "${category.name}" não recebe pontos de nenhuma resposta.`,
        ref: { type: 'category', id: category.id },
      });
    }
    if (!def.modules.some((m) => m.categoryIds.includes(category.id))) {
      issues.push({
        level: 'warning',
        code: 'category_without_module',
        message: `Categoria "${category.name}" não tem módulo do livro associado.`,
        ref: { type: 'category', id: category.id },
      });
    }
  }

  // Etapas e perguntas
  if (def.stages.length === 0) {
    issues.push({ level: 'error', code: 'no_stages', message: 'O quiz não tem nenhuma etapa ativa.' });
  }
  for (const stage of def.stages) {
    const stageRef = { type: 'stage' as const, id: stage.id };
    const firstPosition = stage.questions[0] ? (questionOrder.get(stage.questions[0].id) ?? 0) : null;
    checkCondition(stage.condition, stageRef, `Etapa "${stage.title}"`, firstPosition);

    if (stage.questions.length === 0) {
      issues.push({
        level: 'warning',
        code: 'stage_without_questions',
        message: `Etapa "${stage.title}" não tem perguntas ativas e será ignorada.`,
        ref: stageRef,
      });
    }
    if (stage.offer && !moduleIds.has(stage.offer.moduleId)) {
      issues.push({
        level: 'error',
        code: 'stage_unknown_module',
        message: `Etapa "${stage.title}" oferece um módulo inexistente ou inativo.`,
        ref: stageRef,
      });
    }

    for (const question of stage.questions) {
      const questionRef = { type: 'question' as const, id: question.id };
      const label = `Pergunta "${truncate(question.text)}"`;
      checkCondition(question.condition, questionRef, label, questionOrder.get(question.id) ?? null);

      if (question.options.length < 2) {
        issues.push({
          level: 'error',
          code: 'question_few_options',
          message: `${label}: precisa de pelo menos 2 opções.`,
          ref: questionRef,
        });
      }
      for (const option of question.options) {
        for (const categoryId of Object.keys(option.weights)) {
          if (!categoryIds.has(categoryId)) {
            issues.push({
              level: 'error',
              code: 'weight_unknown_category',
              message: `${label}: a opção "${truncate(option.label)}" pontua uma categoria inexistente ou inativa.`,
              ref: questionRef,
            });
          }
        }
      }
    }
  }

  // Regras
  for (const rule of def.rules) {
    const ruleRef = { type: 'rule' as const, id: rule.id };
    const label = `Regra "${rule.name}"`;
    checkCondition(rule.condition, ruleRef, label, null);
    for (const effect of rule.effects) {
      if ((effect.type === 'addScore' || effect.type === 'multiplyScore') && !categoryIds.has(effect.categoryId)) {
        issues.push({
          level: 'error',
          code: 'rule_unknown_category',
          message: `${label}: efeito usa uma categoria inexistente ou inativa.`,
          ref: ruleRef,
        });
      }
      if (effect.type === 'recommendModule' && !moduleIds.has(effect.moduleId)) {
        issues.push({
          level: 'error',
          code: 'rule_unknown_module',
          message: `${label}: recomenda um módulo inexistente ou inativo.`,
          ref: ruleRef,
        });
      }
      if (effect.type === 'multiplyScore' && effect.factor === 0) {
        issues.push({
          level: 'warning',
          code: 'rule_zero_factor',
          message: `${label}: multiplicar por 0 zera a pontuação de "${categoryNamed(effect.categoryId)}".`,
          ref: ruleRef,
        });
      }
    }
  }

  // Módulos
  for (const module of def.modules) {
    if (module.categoryIds.length === 0) {
      issues.push({
        level: 'warning',
        code: 'module_without_category',
        message: `Módulo "${module.title}" não está ligado a nenhuma categoria e só será recomendado por regras ou concordância de valor.`,
        ref: { type: 'module', id: module.id },
      });
    }
    if (module.priceCents <= 0) {
      issues.push({
        level: 'warning',
        code: 'module_free',
        message: `Módulo "${module.title}" está com preço zero.`,
        ref: { type: 'module', id: module.id },
      });
    }
  }

  // Configurações
  if (def.settings.secondaryMinScore > def.settings.primaryMinScore) {
    issues.push({
      level: 'warning',
      code: 'settings_secondary_above_primary',
      message: 'O mínimo para tema secundário está acima do mínimo para tema principal.',
      ref: { type: 'settings', id: 'engine' },
    });
  }

  return dedupe(issues);
}

function truncate(text: string, max = 50): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function dedupe(issues: DefinitionIssue[]): DefinitionIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}|${issue.ref?.id ?? ''}|${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
