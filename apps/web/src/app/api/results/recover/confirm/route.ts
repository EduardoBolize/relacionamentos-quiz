import { z } from 'zod';
import { trackEvent } from '@/server/analytics';
import { CONSENT_COOKIE, hasAnalyticsConsent } from '@/server/cookies';
import { HttpError, json, route } from '@/server/http';
import { MINUTE, enforceClientRateLimit } from '@/server/security/rate-limit';
import { assertSameOrigin, getClientIp, readJson } from '@/server/security/request';
import { consumeRecovery } from '@/server/services/result-service';

const schema = z.object({ token: z.string().max(100) }).strict();

/**
 * Confirma o link de recuperação. É um POST (acionado por um botão) de propósito: leitores de
 * e-mail que "visitam" links automaticamente não conseguem consumir o link de uso único.
 */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  enforceClientRateLimit('recover-confirm', getClientIp(request), { perIp: 20, global: 1000, windowMs: 15 * MINUTE });
  const { token } = await readJson(request, schema);

  const results = await consumeRecovery(token);
  if (!results) throw new HttpError(410, 'link_expired', 'Este link expirou ou já foi usado. Peça um novo.');

  await trackEvent(hasAnalyticsConsent(request.cookies.get(CONSENT_COOKIE)?.value), 'result_recovered', { via: 'email' });
  return json({ results });
});
