import { adminRoute } from '@/server/admin-route';
import { json } from '@/server/http';
import { saveModule } from '@/server/services/admin-content';

const MAX_MODULE_BYTES = 512 * 1024;

export const POST = adminRoute(async ({ admin, body }) =>
  json(await saveModule(admin, null, await body(MAX_MODULE_BYTES)), { status: 201 }),
);
