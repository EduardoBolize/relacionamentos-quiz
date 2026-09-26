/**
 * Gera código de barras e linha digitável no layout FEBRABAN, usando o código de banco
 * fictício "000" — o boleto parece real, mas não é aceito por nenhum banco.
 */

const MOCK_BANK_CODE = '000';
const CURRENCY_CODE = '9';
const BASE_DATE_UTC = Date.UTC(1997, 9, 7); // 07/10/1997, data-base do fator de vencimento

/** Fator de vencimento (com o reinício em 1000 ocorrido em 22/02/2025). */
export function dueDateFactor(dueDate: Date): string {
  const due = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const days = Math.round((due - BASE_DATE_UTC) / 86_400_000);
  const factor = days < 1000 ? days : ((days - 1000) % 9000) + 1000;
  return factor.toString().padStart(4, '0');
}

export function mod10(digits: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    const product = Number(digits[i]) * weight;
    sum += product > 9 ? Math.floor(product / 10) + (product % 10) : product;
    weight = weight === 2 ? 1 : 2;
  }
  return (10 - (sum % 10)) % 10;
}

export function mod11(digits: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    sum += Number(digits[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const result = 11 - (sum % 11);
  return result === 0 || result === 10 || result === 11 ? 1 : result;
}

/** Transforma uma string qualquer em 25 dígitos determinísticos (campo livre). */
function freeFieldFrom(seed: string): string {
  let digits = '';
  let hash = 2166136261;
  while (digits.length < 25) {
    for (let i = 0; i < seed.length; i += 1) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    digits += (hash % 100000).toString().padStart(5, '0');
  }
  return digits.slice(0, 25);
}

export interface MockBoleto {
  barcode: string;
  digitableLine: string;
}

export function buildMockBoleto(input: { amountCents: number; dueDate: Date; seed: string }): MockBoleto {
  const value = input.amountCents.toString().padStart(10, '0');
  if (value.length > 10) throw new Error('Valor acima do limite do boleto');

  const factor = dueDateFactor(input.dueDate);
  const freeField = freeFieldFrom(input.seed);
  const withoutDv = `${MOCK_BANK_CODE}${CURRENCY_CODE}${factor}${value}${freeField}`;
  const generalDv = mod11(withoutDv);
  const barcode = `${MOCK_BANK_CODE}${CURRENCY_CODE}${generalDv}${factor}${value}${freeField}`;

  const field1 = `${MOCK_BANK_CODE}${CURRENCY_CODE}${freeField.slice(0, 5)}`;
  const field2 = freeField.slice(5, 15);
  const field3 = freeField.slice(15, 25);
  const f1 = `${field1}${mod10(field1)}`;
  const f2 = `${field2}${mod10(field2)}`;
  const f3 = `${field3}${mod10(field3)}`;

  const digitableLine = [
    `${f1.slice(0, 5)}.${f1.slice(5)}`,
    `${f2.slice(0, 5)}.${f2.slice(5)}`,
    `${f3.slice(0, 5)}.${f3.slice(5)}`,
    String(generalDv),
    `${factor}${value}`,
  ].join(' ');

  return { barcode, digitableLine };
}
