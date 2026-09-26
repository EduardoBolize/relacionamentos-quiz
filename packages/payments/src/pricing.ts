export interface PricingSettings {
  /** Desconto (%) aplicado quando o pedido tem `comboMinItems` módulos ou mais. 0 desativa. */
  comboDiscountPercent: number;
  comboMinItems: number;
  /** Máximo de parcelas sem juros no cartão. */
  maxInstallments: number;
  /** Valor mínimo de cada parcela, em centavos. */
  minInstallmentCents: number;
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  comboDiscountPercent: 15,
  comboMinItems: 2,
  maxInstallments: 3,
  minInstallmentCents: 500,
};

export interface QuoteItem {
  id: string;
  title: string;
  priceCents: number;
}

export interface InstallmentOption {
  count: number;
  /** Valor aproximado de cada parcela (o total é sempre `totalCents`). */
  amountCents: number;
}

export interface Quote {
  items: QuoteItem[];
  subtotalCents: number;
  discountCents: number;
  discountPercent: number;
  totalCents: number;
  installmentOptions: InstallmentOption[];
}

/**
 * Calcula o valor do pedido. Deve rodar **sempre no servidor**, com preços lidos do banco —
 * valores enviados pelo navegador nunca são confiáveis.
 */
export function calculateQuote(items: readonly QuoteItem[], settings: PricingSettings): Quote {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) throw new Error(`Item duplicado no pedido: ${item.id}`);
    if (!Number.isSafeInteger(item.priceCents) || item.priceCents < 0) {
      throw new Error(`Preço inválido para o item ${item.id}`);
    }
    ids.add(item.id);
  }

  const subtotalCents = items.reduce((sum, item) => sum + item.priceCents, 0);
  const eligible =
    settings.comboDiscountPercent > 0 && items.length >= Math.max(2, settings.comboMinItems);
  const discountPercent = eligible ? Math.min(90, Math.max(0, settings.comboDiscountPercent)) : 0;
  const discountCents = Math.round((subtotalCents * discountPercent) / 100);
  const totalCents = subtotalCents - discountCents;

  return {
    items: [...items],
    subtotalCents,
    discountCents,
    discountPercent,
    totalCents,
    installmentOptions: installmentOptions(totalCents, settings),
  };
}

export function installmentOptions(totalCents: number, settings: PricingSettings): InstallmentOption[] {
  const options: InstallmentOption[] = [{ count: 1, amountCents: totalCents }];
  const max = Math.min(12, Math.max(1, Math.floor(settings.maxInstallments)));
  for (let count = 2; count <= max; count += 1) {
    const amountCents = Math.round(totalCents / count);
    if (amountCents < settings.minInstallmentCents) break;
    options.push({ count, amountCents });
  }
  return options;
}
