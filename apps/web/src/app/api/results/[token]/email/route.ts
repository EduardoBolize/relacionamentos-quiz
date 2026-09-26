import { z } from 'zod';
import { json, route } from '@/server/http';
import { assertSameOrigin, getClientIp, readJson } from '@/server/security/request';
import { saveResultEmail } from '@/server/services/result-service';

const schema = z
  .object({
    email: z.string().max(254),
    consent: z.literal(true, { message: 'É preciso autorizar o envio do e-mail.' }),
  })
  .strict();

/** Envia o link do resultado por e-mail (com consentimento explícito). */
export const POST = route<{ params: Promise<{ token: string }> }>(async (request, { params }) => {
  assertSameOrigin(request);
  const { token } = await params;
  const { email } = await readJson(request, schema);
  await saveResultEmail(token, email, getClientIp(request));
  return json({ sent: true });
});
