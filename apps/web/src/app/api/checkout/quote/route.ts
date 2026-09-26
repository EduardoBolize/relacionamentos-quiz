import { json, route } from '@/server/http';
import { MINUTE, enforceClientRateLimit } from '@/server/security/rate-limit';
import { assertSameOrigin, getClientIp, readJson } from '@/server/security/request';
import { buildQuote, quoteInputSchema } from '@/server/services/checkout-service';

/** Resumo do pedido calculado no servidor (subtotal, desconto, total e parcelas). */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  enforceClientRateLimit('quote', getClientIp(request), { perIp: 120, global: 10_000, windowMs: 10 * MINUTE });
  const { moduleSlugs } = await readJson(request, quoteInputSchema);
  const { quote } = await buildQuote(moduleSlugs);
  return json(quote);
});
