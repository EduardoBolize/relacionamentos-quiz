import {
  applyAnswer,
  buildFlow,
  getNextStep,
  getProgress,
  getStep,
  getStepAfter,
  getStepBefore,
  isComplete,
  pruneAnswers,
  type FlowState,
} from './flow';
import { computeResult } from './recommendation';
import type { Answers, FlowStep, Progress, QuizDefinition, QuizResult } from './types';
import { validateDefinition, type DefinitionIssue } from './validation';

/**
 * Fachada do motor de recomendação.
 *
 * É uma camada pura: não acessa banco, rede nem relógio. Isso permite testar toda a lógica de
 * pontuação e regras de forma isolada e reutilizar o motor em outro frontend/backend no futuro.
 *
 * @example
 * const engine = new QuizEngine(definition);
 * const next = engine.getNextStep(answers);
 * const updated = engine.applyAnswer(answers, next.id, ['opcao-a']);
 * if (engine.isComplete(updated)) {
 *   const result = engine.computeResult(updated);
 *   // result.primary, result.secondary, result.scores, result.recommendedModules
 * }
 */
export class QuizEngine {
  constructor(readonly definition: QuizDefinition) {}

  buildFlow(answers: Answers): FlowState {
    return buildFlow(this.definition, answers);
  }

  getNextStep(answers: Answers): FlowStep | null {
    return getNextStep(this.definition, answers);
  }

  getStep(answers: Answers, stepId: string): FlowStep | null {
    return getStep(this.definition, answers, stepId);
  }

  getStepAfter(answers: Answers, stepId: string): FlowStep | null {
    return getStepAfter(this.definition, answers, stepId);
  }

  getStepBefore(answers: Answers, stepId: string): FlowStep | null {
    return getStepBefore(this.definition, answers, stepId);
  }

  getProgress(answers: Answers, currentStepId?: string | null): Progress {
    return getProgress(this.definition, answers, currentStepId);
  }

  /** Valida e aplica uma resposta. Lança `AnswerError` quando a resposta é inválida. */
  applyAnswer(answers: Answers, stepId: string, optionIds: readonly string[]): Answers {
    return applyAnswer(this.definition, answers, stepId, optionIds);
  }

  isComplete(answers: Answers): boolean {
    return isComplete(this.definition, answers);
  }

  pruneAnswers(answers: Answers): Answers {
    return pruneAnswers(this.definition, answers);
  }

  /** Categoria principal, secundárias, pontuações e módulos recomendados. */
  computeResult(answers: Answers): QuizResult {
    return computeResult(this.definition, answers);
  }

  validate(): DefinitionIssue[] {
    return validateDefinition(this.definition);
  }
}
