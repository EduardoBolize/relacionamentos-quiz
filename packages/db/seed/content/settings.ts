import type { EngineSettings } from '@relacionamentos/quiz-engine';
import type { ObjectionAnswer } from './types';

/**
 * Respostas às objeções de compra, adaptadas do roteiro de vendas do livro.
 * Aparecem no resultado quando uma regra adiciona o `flag` e na seção de dúvidas da página inicial.
 *
 * Marcadores trocados automaticamente pelos valores atuais (Admin → Configurações):
 * {preco_modulo}, {preco_curso}, {parcelas}, {modulos} e {garantia_dias}.
 */
export const courseObjections: ObjectionAnswer[] = [
  {
    flag: 'objecao_garantia',
    title: 'E se eu for enganada?',
    answer:
      'É natural ficar com o pé atrás: tem muita gente vendendo coisas que não funcionam. Por isso, o Fórmula do Amor tem garantia. Se, em até {garantia_dias} dias depois da compra, você sentir que o conteúdo não é para você, devolvemos o seu dinheiro, sem enrolação e sem burocracia. O nosso compromisso é com a sua felicidade e com a verdade.',
  },
  {
    flag: 'objecao_desconfianca',
    title: 'Já me decepcionei com algo parecido',
    answer:
      'Infelizmente, existem muitas promessas falsas por aí. O Fórmula do Amor é diferente: não promete mágica nem resultados milagrosos. É um conteúdo real, prático e direto, feito de atitudes que você pode aplicar no mesmo dia. E, se por qualquer motivo você achar que não é para você, a garantia de {garantia_dias} dias te protege.',
  },
  {
    flag: 'objecao_eficacia',
    title: 'Será que funciona para o meu caso?',
    answer:
      'Essa dúvida é muito comum, e a gente respeita. O Fórmula do Amor não é uma fórmula mágica: é um conjunto de estratégias que você adapta à sua realidade, inclusive em situações que pareciam não ter mais volta. Com dedicação, as chances são muito maiores. E o método também te ajuda a reconhecer quando é hora de seguir em frente, porque nem toda história deve ser salva.',
  },
  {
    flag: 'objecao_preco',
    title: 'O orçamento está apertado',
    answer:
      'Você não precisa levar tudo de uma vez. Cada módulo custa {preco_modulo}: comece só pelo que faz sentido para o seu momento. Se quiser o curso completo, os {modulos} módulos saem por {preco_curso}, em até {parcelas}x no cartão. Pense nisso como um investimento em você e na sua felicidade.',
  },
  {
    flag: 'objecao_vergonha',
    title: 'Tenho vergonha de pedir ajuda',
    answer:
      'Não tem nada de errado em buscar ajuda. O Fórmula do Amor não é sobre correr atrás de ninguém, e sim sobre redescobrir o seu valor e mostrá-lo de forma autêntica. Você está tomando uma decisão corajosa ao querer transformar a sua história, e isso merece admiração.',
  },
  {
    flag: 'objecao_tempo',
    title: 'Não tenho muito tempo',
    answer:
      'O Fórmula do Amor foi feito para ser simples e direto. Cada módulo tem 3 vídeos de cerca de 1 minuto e um texto objetivo, com exercícios rápidos. Dá para estudar no intervalo do almoço ou antes de dormir, no seu ritmo, e começar a aplicar no mesmo dia.',
  },
  {
    flag: 'objecao_previa',
    title: 'Quero ver antes de comprar',
    answer:
      'Todos os módulos têm prévia gratuita, e a primeira aula em vídeo de cada um é liberada para você assistir antes de decidir. Abra a prévia de qualquer módulo indicado, sem compromisso.',
  },
];

export const courseSettings: {
  engine: EngineSettings;
  pricing: { comboDiscountPercent: number; comboMinItems: number; maxInstallments: number; minInstallmentCents: number };
  payment: { pixExpirationMinutes: number; boletoDueDays: number };
  course: { guaranteeDays: number; fullCourseCheckoutUrl: string | null };
  objections: ObjectionAnswer[];
} = {
  engine: { primaryMinScore: 35, secondaryMinScore: 30, maxSecondary: 2 },
  // 8 módulos de R$ 15 = R$ 120 (valor cheio do curso). Sem desconto de combo por padrão.
  pricing: { comboDiscountPercent: 0, comboMinItems: 2, maxInstallments: 6, minInstallmentCents: 1000 },
  payment: { pixExpirationMinutes: 30, boletoDueDays: 3 },
  course: { guaranteeDays: 7, fullCourseCheckoutUrl: null },
  objections: courseObjections,
};
