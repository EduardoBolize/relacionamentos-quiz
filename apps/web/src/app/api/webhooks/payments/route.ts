import { HttpError, json, route } from '@/server/http';
import { enforceRateLimit } from '@/server/security/rate-limit';
import { getClientIp } from '@/server/security/request';
import { handlePaymentWebhook } from '@/server/services/payment-webhook-service';

const MAX_BODY_BYTES = 64 * 1024;

/**
 * Webhook do provedor de pagamentos. Não usa cookies nem verificação de origem (quem chama é o
 * provedor): a autenticidade é garantida pela assinatura HMAC do corpo, checada pelo gateway.
 */
export const POST = route(async (request) => {
  enforceRateLimit(`webhook:${getClientIp(request)}`, 600, 60 * 1000);
  if (Number(request.headers.get('content-length') ?? '0') > MAX_BODY_BYTES) {
    throw new HttpError(413, 'payload_too_large', 'Corpo muito grande.');
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    throw new HttpError(413, 'payload_too_large', 'Corpo muito grande.');
  }
  const outcome = await handlePaymentWebhook(rawBody, request.headers);
  return json({ received: true, outcome });
});
