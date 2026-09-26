const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata centavos como moeda brasileira (ex.: 2990 → "R$ 29,90"). */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100).replace(/ /g, ' ');
}

/**
 * Converte um valor digitado em reais para centavos.
 * Aceita "29,90", "29.90", "R$ 1.299,90", "1299" — retorna `null` se o texto for inválido.
 */
export function parseBRLToCents(input: string): number | null {
  const cleaned = input.replace(/[R$\s ]/g, '');
  if (!/^[\d.,]+$/.test(cleaned)) return null;

  let normalized: string;
  if (cleaned.includes(',')) {
    // formato brasileiro: ponto = milhar, vírgula = decimal
    if ((cleaned.match(/,/g) ?? []).length > 1) return null;
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if ((cleaned.match(/\./g) ?? []).length === 1 && /\.\d{1,2}$/.test(cleaned)) {
    normalized = cleaned;
  } else {
    normalized = cleaned.replace(/\./g, '');
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}
