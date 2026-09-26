import { z } from 'zod';
import { CONSENT_COOKIE, hasAnalyticsConsent, quizCookieName } from '@/server/cookies';
import { getEngine } from '@/server/definition';
import { HttpError, json, route } from '@/server/http';
import { enforceRateLimit } from '@/server/security/rate-limit';
import { assertSameOrigin, readJson } from '@/server/security/request';
import { answerQuizStep, findSessionByToken } from '@/server/services/quiz-service';

const answerSchema = z
  .object({
    stepId: z.string().min(1).max(120),
    optionIds: z.array(z.string().min(1).max(120)).max(20),
    msOnStep: z.number().int().min(0).max(3_600_000).optional(),
  })
  .strict();

export const POST = route(async (request) => {
  assertSameOrigin(request);
  const token = request.cookies.get(quizCookieName())?.value;
  const session = await findSessionByToken(token);
  if (!session || !token) throw new HttpError(404, 'no_session', 'Sua sessão expirou. Comece o quiz novamente.');
  enforceRateLimit(`quiz-answer:${session.id}`, 300, 10 * 60 * 1000);

  const input = await readJson(request, answerSchema);
  const consent = hasAnalyticsConsent(request.cookies.get(CONSENT_COOKIE)?.value);
  return json(await answerQuizStep(await getEngine(), session.id, token, input, consent));
});
