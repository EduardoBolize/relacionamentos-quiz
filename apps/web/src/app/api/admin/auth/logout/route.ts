import { getAdminTokenFromRequest, logoutAdmin } from '@/server/auth/admin-auth';
import { clearAdminCookie } from '@/server/cookies';
import { json, route } from '@/server/http';
import { assertSameOrigin } from '@/server/security/request';

export const POST = route(async (request) => {
  assertSameOrigin(request);
  await logoutAdmin(getAdminTokenFromRequest(request));
  const response = json({ ok: true });
  clearAdminCookie(response);
  return response;
});
