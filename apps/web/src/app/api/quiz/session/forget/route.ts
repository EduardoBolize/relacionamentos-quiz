import { clearQuizCookie } from '@/server/cookies';
import { json, route } from '@/server/http';
import { assertSameOrigin } from '@/server/security/request';

/**
 * "Remover deste navegador": apaga o cookie da sessão do quiz (o resultado continua acessível pelo
 * link pessoal ou pelo e-mail). Útil em aparelhos compartilhados.
 */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  const response = json({ forgotten: true });
  clearQuizCookie(response);
  return response;
});
