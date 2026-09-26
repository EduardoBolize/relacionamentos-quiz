import { CONSENT_COOKIE, hasAnalyticsConsent, quizCookieName } from '@/server/cookies';
import { json, route } from '@/server/http';
import { assertSameOrigin, getClientIp, readJson } from '@/server/security/request';
import { createOrder, orderInputSchema } from '@/server/services/checkout-service';

/**
 * Cria o pedido e a cobrança. O valor é recalculado no servidor a partir dos preços do banco;
 * do navegador só chegam os módulos escolhidos, os dados do comprador e o token do cartão.
 */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  const input = await readJson(request, orderInputSchema);
  const { orderPath } = await createOrder(input, {
    ip: getClientIp(request),
    consent: hasAnalyticsConsent(request.cookies.get(CONSENT_COOKIE)?.value),
    sessionToken: request.cookies.get(quizCookieName())?.value,
  });
  return json({ orderPath }, { status: 201 });
});
