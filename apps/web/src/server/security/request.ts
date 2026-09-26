import 'server-only';
import type { z } from 'zod';
import { getEnv } from '../env';
import { HttpError } from '../http';

const MAX_JSON_BYTES = 64 * 1024;

/**
 * IP do cliente para limitação de requisições. Só confia em `X-Forwarded-For` quando
 * `TRUST_PROXY=true` (atrás de um proxy reverso que sobrescreve o cabeçalho); caso contrário
 * o valor poderia ser forjado para burlar os limites.
 */
export function getClientIp(request: Request): string {
  if (getEnv().TRUST_PROXY) {
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const real = request.headers.get('x-real-ip')?.trim();
    const ip = forwarded || real;
    if (ip && ip.length <= 64) return ip;
  }
  return 'local';
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

/** Lê e valida um corpo JSON com limite de tamanho e esquema zod. */
export async function readJson<T extends z.ZodType>(request: Request, schema: T, maxBytes = MAX_JSON_BYTES): Promise<z.infer<T>> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'unsupported_media_type', 'Envie os dados em JSON.');
  }
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > maxBytes) throw new HttpError(413, 'payload_too_large', 'Requisição muito grande.');

  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    throw new HttpError(413, 'payload_too_large', 'Requisição muito grande.');
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new HttpError(400, 'invalid_json', 'JSON inválido.');
  }
  return schema.parse(data);
}
