import { z } from 'zod';
import { trackEvent } from '@/server/analytics';
import { CONSENT_COOKIE, hasAnalyticsConsent } from '@/server/cookies';
import { HttpError, json, route } from '@/server/http';
import { enforceRateLimit } from '@/server/security/rate-limit';
import { assertSameOrigin, getClientIp, readJson } from '@/server/security/request';
import { consumeRecovery } from '@/server/services/result-service';

const schema = z.object({ token: z.string().max(100) }).strict();

/**
 * Confirma o link de recuperação. É um POST (acionado por um botão) de propósito: leitores de
 * e-mail que "visitam" links automaticamente não conseguem consumir o link de uso único.
 */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  enforceRateLimit(`recover-confirm:${getClientIp(request)}`, 20, 15 * 60 * 1000);
  const { token } = await readJson(request, schema);

  const results = await consumeRecovery(token);
  if (!results) throw new HttpError(410, 'link_expired', 'Este link expirou ou já foi usado. Peça um novo.');

  await trackEvent(hasAnalyticsConsent(request.cookies.get(CONSENT_COOKIE)?.value), 'result_recovered', { via: 'email' });
  return json({ results });
});
