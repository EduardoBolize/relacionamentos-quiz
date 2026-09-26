import { after } from 'next/server';
import { z } from 'zod';
import { trackEvent } from '@/server/analytics';
import { CONSENT_COOKIE, hasAnalyticsConsent } from '@/server/cookies';
import { json, route } from '@/server/http';
import { assertSameOrigin, getClientIp, readJson } from '@/server/security/request';
import { prepareRecoveryRequest, processRecoveryRequest } from '@/server/services/result-service';

const schema = z.object({ email: z.string().max(254) }).strict();

/**
 * Pede o link de recuperação. A resposta é sempre igual e o trabalho real acontece depois da
 * resposta (`after`), para não revelar — nem pelo conteúdo, nem pelo tempo — se o e-mail existe.
 */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  const { email } = await readJson(request, schema);
  const normalized = prepareRecoveryRequest(email, getClientIp(request));
  const consent = hasAnalyticsConsent(request.cookies.get(CONSENT_COOKIE)?.value);

  after(async () => {
    try {
      await processRecoveryRequest(normalized);
      await trackEvent(consent, 'result_recovery_requested', {});
    } catch (error) {
      console.error('[recuperação] falha ao processar pedido', error);
    }
  });

  return json(
    { message: 'Se houver resultados associados a este e-mail, enviaremos um link de acesso em instantes.' },
    { status: 202 },
  );
});
