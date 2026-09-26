/**
 * Gera um código no formato EMV (o mesmo formato do "Pix copia e cola"), porém com um
 * identificador de arranjo FICTÍCIO (`br.com.exemplo.simulacao` em vez de `br.gov.bcb.pix`).
 * Assim o código tem aparência realista, mas nenhum app de banco consegue pagá-lo.
 */

export const MOCK_PIX_GUI = 'br.com.exemplo.simulacao';

function tlv(id: string, value: string): string {
  if (value.length > 99) throw new Error(`Campo EMV ${id} excede 99 caracteres`);
  return `${id}${value.length.toString().padStart(2, '0')}${value}`;
}

/** CRC16/CCITT-FALSE (polinômio 0x1021, valor inicial 0xFFFF) — o mesmo usado no BR Code. */
export function crc16ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface MockPixInput {
  amountCents: number;
  txid: string;
  merchantName?: string;
  merchantCity?: string;
}

export function buildMockPixPayload(input: MockPixInput): string {
  const txid = input.txid.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || 'SIMULACAO';
  const merchantAccount = tlv('00', MOCK_PIX_GUI) + tlv('01', `simulacao-${txid}`.slice(0, 77));
  const payload =
    tlv('00', '01') +
    tlv('01', '12') +
    tlv('26', merchantAccount) +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('54', (input.amountCents / 100).toFixed(2)) +
    tlv('58', 'BR') +
    tlv('59', (input.merchantName ?? 'SIMULACAO NAO PAGUE').slice(0, 25)) +
    tlv('60', (input.merchantCity ?? 'SAO PAULO').slice(0, 15)) +
    tlv('62', tlv('05', txid)) +
    '6304';
  return payload + crc16ccitt(payload);
}
