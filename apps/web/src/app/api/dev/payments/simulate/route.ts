import { z } from 'zod';
import { HttpError, json, route } from '@/server/http';
import { isSimulatorEnabled } from '@/server/payments';
import { enforceRateLimit } from '@/server/security/rate-limit';
import { assertSameOrigin, getClientIp, readJson } from '@/server/security/request';
import { simulatePayment } from '@/server/services/payment-webhook-service';

const schema = z
  .object({ orderToken: z.string().max(100), outcome: z.enum(['paid', 'failed', 'expired']) })
  .strict();

/**
 * SOMENTE DESENVOLVIMENTO: simula o provedor confirmando/recusando um Pix ou boleto.
 * Responde 404 quando o simulador está desligado (PAYMENT_SIMULATOR_ENABLED=false) ou quando
 * o provedor não é o simulado.
 */
export const POST = route(async (request) => {
  if (!isSimulatorEnabled()) throw new HttpError(404, 'not_found', 'Recurso não encontrado.');
  assertSameOrigin(request);
  enforceRateLimit(`simulate:${getClientIp(request)}`, 60, 10 * 60 * 1000);
  const { orderToken, outcome } = await readJson(request, schema);
  return json({ outcome: await simulatePayment(orderToken, outcome) });
});
