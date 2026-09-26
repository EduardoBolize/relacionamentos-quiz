import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Assinatura de webhooks no formato `t=<unix>,v1=<hmac-sha256 hex>` (mesmo padrão usado por
 * vários provedores). O HMAC cobre `"<t>.<corpo>"`, então alterar o corpo ou reaproveitar uma
 * assinatura antiga (replay fora da janela de tolerância) invalida a requisição.
 */

export const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300;

export class WebhookSignatureError extends Error {
  constructor(
    readonly reason: 'missing_header' | 'malformed_header' | 'timestamp_out_of_range' | 'signature_mismatch',
  ) {
    super(`Assinatura de webhook inválida (${reason})`);
    this.name = 'WebhookSignatureError';
  }
}

function hmac(secret: string, timestamp: number, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex');
}

export function signWebhookPayload(secret: string, body: string, timestampSeconds: number): string {
  return `t=${timestampSeconds},v1=${hmac(secret, timestampSeconds, body)}`;
}

export function verifyWebhookSignature(
  secret: string,
  header: string | null | undefined,
  body: string,
  options: { toleranceSeconds?: number; nowSeconds?: number } = {},
): void {
  if (!header) throw new WebhookSignatureError('missing_header');

  const parts = new Map<string, string>();
  for (const part of header.split(',')) {
    const [key, ...rest] = part.trim().split('=');
    if (key && rest.length > 0) parts.set(key, rest.join('='));
  }
  const timestamp = Number(parts.get('t'));
  const signature = parts.get('v1');
  if (!Number.isInteger(timestamp) || !signature || !/^[0-9a-f]{64}$/.test(signature)) {
    throw new WebhookSignatureError('malformed_header');
  }

  const tolerance = options.toleranceSeconds ?? DEFAULT_WEBHOOK_TOLERANCE_SECONDS;
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) {
    throw new WebhookSignatureError('timestamp_out_of_range');
  }

  const expected = Buffer.from(hmac(secret, timestamp, body), 'hex');
  const received = Buffer.from(signature, 'hex');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new WebhookSignatureError('signature_mismatch');
  }
}
