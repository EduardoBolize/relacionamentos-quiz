import type { Condition, RuleEffect } from '@relacionamentos/quiz-engine';

/** Formatos do conteúdo inicial do curso (gravado no banco pelo seed e editável no painel admin). */

export interface ContentCategory {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  explanation: string;
  color: string;
}

export interface ContentVideo {
  id: string;
  title: string;
  /** Duração aproximada, em segundos (as aulas têm cerca de 1 minuto). */
  durationSeconds: number;
  /** Roteiro de narração — também exibido como transcrição. */
  script: string;
  /** Frases curtas para mostrar na tela durante o vídeo (uma por linha). */
  keyPoints: string;
  /** Aula liberada como amostra grátis na página pública do módulo. */
  isPreview?: boolean;
}

export interface ContentModule {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  previewContent: string;
  content: string;
  priceCents: number;
  coverEmoji: string;
  categoryIds: string[];
  videos: ContentVideo[];
}

export interface ContentOption {
  id: string;
  label: string;
  weights?: Record<string, number>;
}

export interface ContentQuestion {
  id: string;
  text: string;
  helpText?: string;
  type: 'single' | 'multiple' | 'scale';
  required?: boolean;
  maxSelections?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  condition?: Condition;
  options: ContentOption[];
}

export interface ContentStage {
  id: string;
  title: string;
  description: string;
  condition?: Condition;
  offerModuleId?: string;
  priceQuestionEnabled?: boolean;
  priceQuestionMinScore?: number;
  questions: ContentQuestion[];
}

export interface ContentRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  condition: Condition;
  effects: RuleEffect[];
}

/**
 * Resposta a uma objeção de compra, exibida no resultado quando uma regra adiciona o `flag`
 * correspondente (e na seção de dúvidas da página inicial).
 */
export interface ObjectionAnswer {
  flag: string;
  title: string;
  answer: string;
}
