import { describe, expect, it } from 'vitest';
import {
  CardValidationError,
  TEST_CARDS,
  tokenizeCardMock,
  validateCardForm,
} from '../src/client';
import {
  decodeMockCardToken,
  detectBrand,
  formatCardNumber,
  formatCpf,
  isValidCpf,
  isValidCvv,
  isValidExpiry,
  luhnCheck,
  maskCpf,
} from '../src';

const now = new Date('2026-09-25T12:00:00Z');
const validForm = { number: '4111 1111 1111 1111', holderName: 'Maria Silva', expiry: '12/30', cvv: '123' };

describe('cartão — validações no navegador', () => {
  it('valida o dígito verificador (Luhn)', () => {
    for (const card of TEST_CARDS) expect(luhnCheck(card.number)).toBe(true);
    expect(luhnCheck('4111 1111 1111 1112')).toBe(false);
    expect(luhnCheck('123')).toBe(false);
  });

  it('detecta a bandeira', () => {
    expect(detectBrand('4111111111111111')).toBe('visa');
    expect(detectBrand('5555555555554444')).toBe('mastercard');
    expect(detectBrand('378282246310005')).toBe('amex');
    expect(detectBrand('6362970000457013')).toBe('elo');
  });

  it('valida validade e CVV', () => {
    expect(isValidExpiry('12/30', now)).toBe(true);
    expect(isValidExpiry('09/26', now)).toBe(true);
    expect(isValidExpiry('08/26', now)).toBe(false);
    expect(isValidExpiry('13/30', now)).toBe(false);
    expect(isValidCvv('123', 'visa')).toBe(true);
    expect(isValidCvv('1234', 'amex')).toBe(true);
    expect(isValidCvv('12a', 'visa')).toBe(false);
  });

  it('formata o número enquanto a pessoa digita', () => {
    expect(formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111');
  });

  it('aponta os campos inválidos do formulário', () => {
    const errors = validateCardForm({ number: '1234', holderName: 'A', expiry: '00/00', cvv: '1' }, now);
    expect(Object.keys(errors).sort()).toEqual(['cvv', 'expiry', 'holderName', 'number']);
  });
});

describe('cartão — tokenização simulada', () => {
  it('gera um token sem o número completo do cartão', () => {
    const { token, brand, last4 } = tokenizeCardMock(validForm, now);
    expect(brand).toBe('visa');
    expect(last4).toBe('1111');
    expect(token).not.toContain('4111111111111111');
    expect(token).not.toContain('123');
    expect(decodeMockCardToken(token)).toEqual({ outcome: 'approved', brand: 'visa', last4: '1111' });
  });

  it('mapeia os cartões de teste para os resultados esperados', () => {
    const declined = tokenizeCardMock({ ...validForm, number: '4000 0000 0000 0002' }, now);
    expect(decodeMockCardToken(declined.token)?.outcome).toBe('declined');
    const funds = tokenizeCardMock({ ...validForm, number: '5105 1051 0510 5100' }, now);
    expect(decodeMockCardToken(funds.token)?.outcome).toBe('insufficient_funds');
  });

  it('cartões reais (fora da lista de teste) nunca são aprovados na simulação', () => {
    const { token } = tokenizeCardMock({ ...validForm, number: '4012 8888 8888 1881' }, now);
    expect(decodeMockCardToken(token)?.outcome).toBe('not_test_card');
  });

  it('lança erro de validação com os campos inválidos', () => {
    expect(() => tokenizeCardMock({ ...validForm, cvv: '' }, now)).toThrow(CardValidationError);
  });

  it('rejeita tokens em formato inesperado', () => {
    expect(decodeMockCardToken('mock_tok.approved.visa.1111')).toBeNull();
    expect(decodeMockCardToken('tok_real_de_outro_provedor')).toBeNull();
  });
});

describe('CPF', () => {
  it('valida os dígitos verificadores', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('123')).toBe(false);
  });

  it('formata e mascara', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
    expect(maskCpf('52998224725')).toBe('***.982.247-**');
  });
});
