import { z } from 'zod';
import { trackEvent } from '@/server/analytics';
import { CONSENT_COOKIE, hasAnalyticsConsent, quizCookieName, quizCookieOptions } from '@/server/cookies';
import { getEngine } from '@/server/definition';
import { HttpError, json, route } from '@/server/http';
import { MINUTE, enforceClientRateLimit } from '@/server/security/rate-limit';
import { assertSameOrigin, getClientIp, readJson } from '@/server/security/request';
import { buildQuizState, createQuizSession, findSessionByToken } from '@/server/services/quiz-service';

const startSchema = z.object({ source: z.string().trim().max(40).optional() }).strict();

/** Inicia um novo quiz (sempre uma sessão nova) e grava o token em cookie HttpOnly. */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  enforceClientRateLimit('quiz-start', getClientIp(request), { perIp: 30, global: 3000, windowMs: 10 * MINUTE });
  const { source } = await readJson(request, startSchema);

  const engine = await getEngine();
  const { session, token } = await createQuizSession();
  const consent = hasAnalyticsConsent(request.cookies.get(CONSENT_COOKIE)?.value);
  await trackEvent(consent, 'quiz_started', source ? { source } : {}, session.id);

  const response = json(await buildQuizState(engine, session, token), { status: 201 });
  response.cookies.set(quizCookieName(), token, quizCookieOptions());
  return response;
});

/**
 * Estado do quiz em andamento (permite retomar de onde parou e navegar para trás).
 * Sem sessão, responde `{ status: "none" }` (a interface mostra a introdução).
 */
export const GET = route(async (request) => {
  const token = request.cookies.get(quizCookieName())?.value;
  const session = await findSessionByToken(token);
  if (!session || !token) {
    if (request.nextUrl.searchParams.has('at')) throw new HttpError(404, 'no_session', 'Nenhum quiz em andamento.');
    return json({ status: 'none' });
  }

  const params = request.nextUrl.searchParams;
  const at = params.get('at');
  if (at && at.length > 120) throw new HttpError(400, 'invalid_step', 'Passo inválido.');
  const direction = params.get('dir') === 'prev' ? 'prev' : 'current';

  return json(await buildQuizState(await getEngine(), session, token, { at, direction }));
});
