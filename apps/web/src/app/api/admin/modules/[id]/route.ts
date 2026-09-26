import { adminRoute } from '@/server/admin-route';
import { json } from '@/server/http';
import { deleteModule, saveModule } from '@/server/services/admin-content';

const MAX_MODULE_BYTES = 512 * 1024;

export const PUT = adminRoute<{ id: string }>(async ({ admin, params, body }) =>
  json(await saveModule(admin, params.id, await body(MAX_MODULE_BYTES))),
);

export const DELETE = adminRoute<{ id: string }>(async ({ admin, params }) => json(await deleteModule(admin, params.id)));
