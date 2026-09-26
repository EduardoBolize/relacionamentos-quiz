import { adminRoute } from '@/server/admin-route';
import { json } from '@/server/http';
import { deleteQuestion, saveQuestion } from '@/server/services/admin-content';

export const PUT = adminRoute<{ id: string }>(async ({ admin, params, body }) => json(await saveQuestion(admin, params.id, await body())));

export const DELETE = adminRoute<{ id: string }>(async ({ admin, params }) => json(await deleteQuestion(admin, params.id)));
