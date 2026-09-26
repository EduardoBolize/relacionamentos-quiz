import { createEvent, isClientEventName } from '@relacionamentos/analytics';
import { z } from 'zod';
import { trackEvent } from '@/server/analytics';
import { CONSENT_COOKIE, hasAnalyticsConsent, quizCookieName } from '@/server/cookies';
import { HttpError, route } from '@/server/http';
import { enforceRateLimit } from '@/server/security/rate-limit';
import { assertSameOrigin, getClientIp, readJson } from '@/server/security/request';
import { findSessionByToken } from '@/server/services/quiz-service';

const schema = z.object({ name: z.string().max(60), props: z.record(z.string(), z.unknown()).default({}) }).strict();

/**
 * Eventos enviados pelo navegador. Só aceita os eventos de cliente do catálogo, com propriedades
 * validadas, e só registra algo se houver consentimento.
 */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  enforceRateLimit(`analytics:${getClientIp(request)}`, 120, 10 * 60 * 1000);
  const { name, props } = await readJson(request, schema, 4 * 1024);
  if (!isClientEventName(name)) throw new HttpError(400, 'unknown_event', 'Evento não permitido.');

  const consent = hasAnalyticsConsent(request.cookies.get(CONSENT_COOKIE)?.value);
  if (!consent) return new Response(null, { status: 204 });

  const event = createEvent(name, props);
  if (!event) throw new HttpError(400, 'invalid_event', 'Propriedades inválidas.');

  const session = await findSessionByToken(request.cookies.get(quizCookieName())?.value);
  await trackEvent(true, event.name, event.props as never, session?.id);
  return new Response(null, { status: 204 });
});
