import { clearQuizCookie, quizCookieName } from '@/server/cookies';
import { HttpError, json, route } from '@/server/http';
import { HOUR, enforceClientRateLimit } from '@/server/security/rate-limit';
import { assertSameOrigin, getClientIp } from '@/server/security/request';
import { deleteResult } from '@/server/services/result-service';

/**
 * Exclusão dos dados do resultado a pedido da pessoa (LGPD, art. 18).
 * Só o link de DONO pode excluir — links de compartilhamento são somente leitura.
 */
export const DELETE = route<{ params: Promise<{ token: string }> }>(async (request, { params }) => {
  assertSameOrigin(request);
  enforceClientRateLimit('result-delete', getClientIp(request), { perIp: 20, global: 2000, windowMs: HOUR });
  const { token } = await params;
  if (!(await deleteResult(token))) throw new HttpError(404, 'not_found', 'Resultado não encontrado.');

  const response = json({ deleted: true });
  if (request.cookies.get(quizCookieName())?.value === token) clearQuizCookie(response);
  return response;
});
