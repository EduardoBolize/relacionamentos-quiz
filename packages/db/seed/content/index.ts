/**
 * CONTEÚDO DO CURSO "FÓRMULA DO AMOR" — baseado no livro de Miguel Palhares.
 *
 * O livro foi reorganizado em 8 módulos (texto + 3 aulas em vídeo de ~1 minuto cada) e o quiz
 * foi montado a partir do roteiro de objeções de venda. Tudo aqui é gravado no banco pelo seed
 * e pode ser editado depois no painel admin (/admin), sem mexer em código.
 */

export const COURSE = {
  title: 'Fórmula do Amor',
  tagline: 'O método de conquista que vai mudar sua realidade amorosa',
  author: 'Miguel Palhares',
} as const;

export { courseModules } from './modules';
export { courseCategories, courseRules, courseStages } from './quiz';
export { courseObjections, courseSettings } from './settings';
export type * from './types';
