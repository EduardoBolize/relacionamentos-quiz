import { quizCookieName } from '@/server/cookies';
import { HttpError, json, route } from '@/server/http';
import { enforceRateLimit } from '@/server/security/rate-limit';
import { assertSameOrigin, getClientIp } from '@/server/security/request';
import { deleteResult } from '@/server/services/result-service';

/** Exclusão dos dados do resultado a pedido da pessoa (LGPD, art. 18). */
export const DELETE = route<{ params: Promise<{ token: string }> }>(async (request, { params }) => {
  assertSameOrigin(request);
  enforceRateLimit(`result-delete:${getClientIp(request)}`, 20, 60 * 60 * 1000);
  const { token } = await params;
  if (!(await deleteResult(token))) throw new HttpError(404, 'not_found', 'Resultado não encontrado.');

  const response = json({ deleted: true });
  if (request.cookies.get(quizCookieName())?.value === token) response.cookies.delete(quizCookieName());
  return response;
});
