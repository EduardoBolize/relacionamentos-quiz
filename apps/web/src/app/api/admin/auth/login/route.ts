import { z } from 'zod';
import { loginAdmin } from '@/server/auth/admin-auth';
import { adminCookieName, adminCookieOptions } from '@/server/cookies';
import { HttpError, json, route } from '@/server/http';
import { assertSameOrigin, getClientIp, readJson } from '@/server/security/request';

const schema = z.object({ email: z.string().trim().max(254), password: z.string().min(1).max(200) }).strict();

export const POST = route(async (request) => {
  assertSameOrigin(request);
  const { email, password } = await readJson(request, schema);
  const result = await loginAdmin({
    email,
    password,
    ip: getClientIp(request),
    userAgent: request.headers.get('user-agent'),
  });

  if (!result.ok) {
    // Mensagens genéricas: não revelam se o e-mail existe nem se a conta foi bloqueada.
    if (result.reason === 'throttled') {
      throw new HttpError(429, 'rate_limited', 'Muitas tentativas. Aguarde alguns minutos e tente novamente.', { retryAfter: 900 });
    }
    throw new HttpError(401, 'invalid_credentials', 'E-mail ou senha inválidos.');
  }

  const response = json({ ok: true, name: result.admin.name });
  response.cookies.set(adminCookieName(), result.token, adminCookieOptions(result.expiresAt));
  return response;
});
