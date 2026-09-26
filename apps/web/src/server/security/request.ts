import 'server-only';
import type { z } from 'zod';
import { getEnv } from '../env';
import { HttpError } from '../http';

const MAX_JSON_BYTES = 64 * 1024;
const IP_PATTERN = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-fA-F:]{2,39}(?:%[0-9A-Za-z]{1,16})?|::ffff:\d{1,3}(?:\.\d{1,3}){3})$/;

/**
 * IP do cliente para limitação de requisições, ou `null` quando não é possível saber com segurança.
 *
 * O `X-Forwarded-For` só é confiável até onde há proxies nossos: cada proxy ACRESCENTA o endereço de
 * quem o chamou no fim da lista, e tudo à esquerda pode ter sido escrito pelo próprio cliente. Por isso
 * lemos o valor que está `TRUST_PROXY_HOPS` posições a partir da DIREITA. Sem proxy configurado,
 * o cabeçalho é ignorado (o Next.js só o preenche quando o cliente não o envia).
 */
export function getClientIp(request: Request): string | null {
  const hops = getEnv().trustedProxyHops;
  if (hops <= 0) return null;
  const chain = (request.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const candidate = chain[chain.length - hops];
  return candidate && candidate.length <= 45 && IP_PATTERN.test(candidate) ? candidate : null;
}

/**
 * Proteção contra CSRF para requisições que alteram estado: exige que `Origin` (ou, na falta dele,
 * `Referer`) seja a própria aplicação e rejeita requisições marcadas como cross-site pelo navegador.
 * Soma-se aos cookies `SameSite` e à exigência de `Content-Type: application/json`.
 */
export function assertSameOrigin(request: Request): void {
  const allowed = new Set([new URL(getEnv().APP_URL).origin, new URL(request.url).origin]);

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    throw new HttpError(403, 'forbidden_origin', 'Origem da requisição não permitida.');
  }

  const origin = request.headers.get('origin');
  if (origin) {
    if (!allowed.has(origin)) throw new HttpError(403, 'forbidden_origin', 'Origem da requisição não permitida.');
    return;
  }

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      if (allowed.has(new URL(referer).origin)) return;
    } catch {
      // referer inválido
    }
  }
  throw new HttpError(403, 'forbidden_origin', 'Origem da requisição não permitida.');
}

/**
 * Lê o corpo como texto, interrompendo a leitura assim que o limite é ultrapassado — inclusive em
 * requisições sem `Content-Length` (transferência em partes), que de outra forma poderiam esgotar a memória.
 */
export async function readBodyText(request: Request, maxBytes: number): Promise<string> {
  const declared = Number(request.headers.get('content-length') ?? '');
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new HttpError(413, 'payload_too_large', 'Requisição muito grande.');
  }
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new HttpError(413, 'payload_too_large', 'Requisição muito grande.');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Lê e valida um corpo JSON com limite de tamanho e esquema zod. */
export async function readJson<T extends z.ZodType>(request: Request, schema: T, maxBytes = MAX_JSON_BYTES): Promise<z.infer<T>> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'unsupported_media_type', 'Envie os dados em JSON.');
  }
  const text = await readBodyText(request, maxBytes);

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new HttpError(400, 'invalid_json', 'JSON inválido.');
  }
  return schema.parse(data);
}
