import { adminRoute } from '@/server/admin-route';
import { json } from '@/server/http';
import { updateSettings } from '@/server/services/admin-content';

export const PUT = adminRoute(async ({ admin, body }) => json(await updateSettings(admin, await body())));
