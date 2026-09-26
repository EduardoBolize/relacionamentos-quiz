import { adminRoute } from '@/server/admin-route';
import { json } from '@/server/http';
import { updatePrices } from '@/server/services/admin-content';

export const PUT = adminRoute(async ({ admin, body }) => json(await updatePrices(admin, await body())));
