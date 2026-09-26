import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICING_SETTINGS, calculateQuote, formatBRL, parseBRLToCents } from '../src';

const items = [
  { id: 'a', title: 'Módulo A', priceCents: 2990 },
  { id: 'b', title: 'Módulo B', priceCents: 1990 },
];

describe('precificação', () => {
  it('soma os itens sem desconto quando há um único módulo', () => {
    const quote = calculateQuote(items.slice(0, 1), DEFAULT_PRICING_SETTINGS);
    expect(quote).toMatchObject({ subtotalCents: 2990, discountCents: 0, totalCents: 2990 });
  });

  it('aplica o desconto de combo a partir do mínimo de itens', () => {
    const quote = calculateQuote(items, { ...DEFAULT_PRICING_SETTINGS, comboDiscountPercent: 15 });
    expect(quote.subtotalCents).toBe(4980);
    expect(quote.discountCents).toBe(747);
    expect(quote.totalCents).toBe(4233);
    expect(quote.discountPercent).toBe(15);
  });

  it('não aplica desconto quando ele está desativado', () => {
    const quote = calculateQuote(items, { ...DEFAULT_PRICING_SETTINGS, comboDiscountPercent: 0 });
    expect(quote.totalCents).toBe(4980);
  });

  it('gera opções de parcelamento respeitando a parcela mínima', () => {
    const settings = { ...DEFAULT_PRICING_SETTINGS, maxInstallments: 6, minInstallmentCents: 1000 };
    const quote = calculateQuote(items, { ...settings, comboDiscountPercent: 0 });
    expect(quote.installmentOptions.map((o) => o.count)).toEqual([1, 2, 3, 4]);
    expect(quote.installmentOptions[2]).toEqual({ count: 3, amountCents: 1660 });
  });

  it('rejeita itens duplicados e preços inválidos', () => {
    expect(() => calculateQuote([items[0]!, items[0]!], DEFAULT_PRICING_SETTINGS)).toThrow();
    expect(() => calculateQuote([{ id: 'x', title: 'x', priceCents: -1 }], DEFAULT_PRICING_SETTINGS)).toThrow();
    expect(() => calculateQuote([{ id: 'x', title: 'x', priceCents: 10.5 }], DEFAULT_PRICING_SETTINGS)).toThrow();
  });
});

describe('dinheiro', () => {
  it('formata centavos em reais', () => {
    expect(formatBRL(2990)).toBe('R$ 29,90');
    expect(formatBRL(129990)).toBe('R$ 1.299,90');
  });

  it('interpreta valores digitados no admin', () => {
    expect(parseBRLToCents('29,90')).toBe(2990);
    expect(parseBRLToCents('R$ 1.299,90')).toBe(129990);
    expect(parseBRLToCents('29.9')).toBe(2990);
    expect(parseBRLToCents('30')).toBe(3000);
    expect(parseBRLToCents('1.000')).toBe(100000);
    expect(parseBRLToCents('abc')).toBeNull();
    expect(parseBRLToCents('1,2,3')).toBeNull();
    expect(parseBRLToCents('-5')).toBeNull();
  });
});
