import { detectBrand, isValidCvv, isValidExpiry, luhnCheck, onlyDigits, type CardBrand } from '../card';
import { TEST_CARDS, encodeMockCardToken } from './card-token';

/**
 * "SDK" de tokenização do gateway simulado — roda **no navegador**.
 *
 * Substitua por o SDK do provedor real (ex.: `MercadoPago.createCardToken`, `tokenizecard.js` do
 * Pagar.me, `stripe.createPaymentMethod`). O contrato com o servidor continua o mesmo:
 * enviar apenas `{ cardToken, installments }`.
 */

export interface CardFormInput {
  number: string;
  holderName: string;
  expiry: string;
  cvv: string;
}

export type CardFormErrors = Partial<Record<keyof CardFormInput, string>>;

export class CardValidationError extends Error {
  constructor(readonly errors: CardFormErrors) {
    super('Dados do cartão inválidos');
    this.name = 'CardValidationError';
  }
}

export function validateCardForm(input: CardFormInput, now: Date = new Date()): CardFormErrors {
  const errors: CardFormErrors = {};
  const brand = detectBrand(input.number);
  if (!luhnCheck(input.number)) errors.number = 'Número de cartão inválido.';
  if (input.holderName.trim().length < 3) errors.holderName = 'Informe o nome impresso no cartão.';
  if (!isValidExpiry(input.expiry, now)) errors.expiry = 'Validade inválida (use MM/AA).';
  if (!isValidCvv(input.cvv, brand)) errors.cvv = 'CVV inválido.';
  return errors;
}

export interface TokenizedCard {
  token: string;
  brand: CardBrand;
  last4: string;
}

export function tokenizeCardMock(input: CardFormInput, now: Date = new Date()): TokenizedCard {
  const errors = validateCardForm(input, now);
  if (Object.keys(errors).length > 0) throw new CardValidationError(errors);

  const digits = onlyDigits(input.number);
  const brand = detectBrand(digits);
  const last4 = digits.slice(-4);
  const testCard = TEST_CARDS.find((card) => onlyDigits(card.number) === digits);
  const outcome = testCard?.outcome ?? 'not_test_card';

  const nonce = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(8)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');

  return { token: encodeMockCardToken({ outcome, brand, last4 }, nonce), brand, last4 };
}
