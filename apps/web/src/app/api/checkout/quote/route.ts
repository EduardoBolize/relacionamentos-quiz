import { json, route } from '@/server/http';
import { enforceRateLimit } from '@/server/security/rate-limit';
import { assertSameOrigin, getClientIp, readJson } from '@/server/security/request';
import { buildQuote, quoteInputSchema } from '@/server/services/checkout-service';

/** Resumo do pedido calculado no servidor (subtotal, desconto, total e parcelas). */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  enforceRateLimit(`quote:${getClientIp(request)}`, 120, 10 * 60 * 1000);
  const { moduleSlugs } = await readJson(request, quoteInputSchema);
  const { quote } = await buildQuote(moduleSlugs);
  return json(quote);
});
