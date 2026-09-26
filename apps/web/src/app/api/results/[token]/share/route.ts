import { json, route } from '@/server/http';
import { assertSameOrigin } from '@/server/security/request';
import { createShareLink } from '@/server/services/result-service';

/** Gera um link de compartilhamento somente leitura (apenas o dono do resultado pode gerar). */
export const POST = route<{ params: Promise<{ token: string }> }>(async (request, { params }) => {
  assertSameOrigin(request);
  const { token } = await params;
  return json({ sharePath: await createShareLink(token) }, { status: 201 });
});
