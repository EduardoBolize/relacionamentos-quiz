import { adminRoute } from '@/server/admin-route';
import { json } from '@/server/http';
import { changeOwnPassword } from '@/server/services/admin-content';

export const PUT = adminRoute(async ({ admin, body }) => {
  await changeOwnPassword(admin, await body());
  return json({ ok: true });
});
