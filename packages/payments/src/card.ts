/**
 * Validações de cartão executadas no navegador (antes da tokenização).
 * Nenhuma destas funções envia dados para lugar algum.
 */

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'elo' | 'hipercard' | 'desconhecida';

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Algoritmo de Luhn (dígito verificador de cartões). */
export function luhnCheck(cardNumber: string): boolean {
  const digits = onlyDigits(cardNumber);
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function detectBrand(cardNumber: string): CardBrand {
  const digits = onlyDigits(cardNumber);
  // Prefixos mais comuns da Elo (lista simplificada — serve apenas para exibir a bandeira).
  if (/^(401178|401179|431274|438935|451416|457393|457631|457632|504175|506699|5067|509|627780|636297|636368|650|6516|6550)/.test(digits)) {
    return 'elo';
  }
  if (/^(606282|3841)/.test(digits)) return 'hipercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return 'mastercard';
  if (/^4/.test(digits)) return 'visa';
  return 'desconhecida';
}

/** Valida validade no formato MM/AA (ou MM/AAAA). */
export function isValidExpiry(expiry: string, now: Date = new Date()): boolean {
  const match = /^(\d{2})\s*\/\s*(\d{2}|\d{4})$/.exec(expiry.trim());
  if (!match) return false;
  const month = Number(match[1]);
  let year = Number(match[2]);
  if (month < 1 || month > 12) return false;
  if (year < 100) year += 2000;
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  const limit = new Date(now.getFullYear() + 20, now.getMonth(), 1);
  return endOfMonth >= now && endOfMonth <= limit;
}

export function isValidCvv(cvv: string, brand: CardBrand): boolean {
  const digits = onlyDigits(cvv);
  if (digits.length !== cvv.trim().length) return false;
  return brand === 'amex' ? digits.length === 4 : digits.length === 3;
}

/** "4111111111111111" → "4111 1111 1111 1111" (para exibir enquanto a pessoa digita). */
export function formatCardNumber(value: string): string {
  return onlyDigits(value)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}
