import { getAdminTokenFromRequest, logoutAdmin } from '@/server/auth/admin-auth';
import { adminCookieName } from '@/server/cookies';
import { json, route } from '@/server/http';
import { assertSameOrigin } from '@/server/security/request';

export const POST = route(async (request) => {
  assertSameOrigin(request);
  await logoutAdmin(getAdminTokenFromRequest(request));
  const response = json({ ok: true });
  response.cookies.delete(adminCookieName());
  return response;
});
