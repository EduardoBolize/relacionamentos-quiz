import { adminRoute } from '@/server/admin-route';
import { json } from '@/server/http';
import { saveCategory } from '@/server/services/admin-content';

export const POST = adminRoute(async ({ admin, body }) => json(await saveCategory(admin, null, await body()), { status: 201 }));
