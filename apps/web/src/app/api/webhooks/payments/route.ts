import { json, route } from '@/server/http';
import { MINUTE, enforceClientRateLimit } from '@/server/security/rate-limit';
import { getClientIp, readBodyText } from '@/server/security/request';
import { handlePaymentWebhook } from '@/server/services/payment-webhook-service';

const MAX_BODY_BYTES = 64 * 1024;

/**
 * Webhook do provedor de pagamentos. Não usa cookies nem verificação de origem (quem chama é o
 * provedor): a autenticidade é garantida pela assinatura HMAC do corpo, checada pelo gateway.
 */
export const POST = route(async (request) => {
  enforceClientRateLimit('webhook', getClientIp(request), { perIp: 600, windowMs: MINUTE });
  const rawBody = await readBodyText(request, MAX_BODY_BYTES);
  const outcome = await handlePaymentWebhook(rawBody, request.headers);
  return json({ received: true, outcome });
});
