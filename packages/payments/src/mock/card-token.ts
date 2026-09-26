import type { CardBrand } from '../card';

/**
 * Formato do token de cartão do gateway SIMULADO.
 *
 * Em um provedor real o token é emitido pelos servidores do provedor (via SDK no navegador);
 * aqui ele é gerado localmente apenas para simular esse fluxo. Ele carrega o "resultado"
 * esperado do cartão de teste, a bandeira e os 4 últimos dígitos — nunca o número completo.
 */

export type MockCardOutcome = 'approved' | 'declined' | 'insufficient_funds' | 'not_test_card';

export interface TestCard {
  number: string;
  brand: CardBrand;
  outcome: Exclude<MockCardOutcome, 'not_test_card'>;
  description: string;
}

/** Cartões de teste aceitos pela simulação (qualquer validade futura e qualquer CVV). */
export const TEST_CARDS: readonly TestCard[] = [
  { number: '4111 1111 1111 1111', brand: 'visa', outcome: 'approved', description: 'Pagamento aprovado' },
  { number: '5555 5555 5555 4444', brand: 'mastercard', outcome: 'approved', description: 'Pagamento aprovado' },
  { number: '4000 0000 0000 0002', brand: 'visa', outcome: 'declined', description: 'Recusado pelo emissor' },
  { number: '5105 1051 0510 5100', brand: 'mastercard', outcome: 'insufficient_funds', description: 'Saldo insuficiente' },
];

export const CARD_FAILURE_MESSAGES: Record<Exclude<MockCardOutcome, 'approved'>, string> = {
  declined: 'Pagamento recusado pelo emissor do cartão.',
  insufficient_funds: 'Pagamento recusado: saldo ou limite insuficiente.',
  not_test_card: 'No modo de simulação, use um dos cartões de teste informados na tela.',
};

const TOKEN_PATTERN =
  /^mock_tok\.(approved|declined|insufficient_funds|not_test_card)\.(visa|mastercard|amex|elo|hipercard|desconhecida)\.(\d{4})\.([a-f0-9]{16})$/;

export interface MockCardToken {
  outcome: MockCardOutcome;
  brand: CardBrand;
  last4: string;
}

export function encodeMockCardToken(token: MockCardToken, nonceHex: string): string {
  return `mock_tok.${token.outcome}.${token.brand}.${token.last4}.${nonceHex}`;
}

export function decodeMockCardToken(value: string): MockCardToken | null {
  const match = TOKEN_PATTERN.exec(value);
  if (!match) return null;
  return {
    outcome: match[1] as MockCardOutcome,
    brand: match[2] as CardBrand,
    last4: match[3]!,
  };
}
