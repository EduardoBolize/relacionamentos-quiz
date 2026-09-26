import 'server-only';
import { HttpError } from '../http';

/**
 * Limitador de requisições em memória (janela fixa).
 *
 * Suficiente para uma única instância. Com várias instâncias (ex.: serverless ou cluster),
 * substitua por um armazenamento compartilhado (Redis/Upstash) mantendo a mesma interface.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

/** Teto de chaves em memória: impede que chaves únicas (ex.: e-mails aleatórios) esgotem a RAM. */
export const MAX_BUCKETS = 50_000;

const globalStore = globalThis as unknown as { __rqRateLimit?: Map<string, Bucket> };
const buckets = (globalStore.__rqRateLimit ??= new Map<string, Bucket>());

function prune(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  // Ainda cheio: descarta as chaves mais antigas (o Map preserva a ordem de inserção).
  let excess = buckets.size - MAX_BUCKETS + 1;
  for (const key of buckets.keys()) {
    if (excess-- <= 0) break;
    buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (!bucket) prune(now);
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

/** Lança HTTP 429 quando o limite é excedido. */
export function enforceRateLimit(key: string, limit: number, windowMs: number): void {
  const result = checkRateLimit(key, limit, windowMs);
  if (!result.allowed) {
    throw new HttpError(429, 'rate_limited', 'Muitas tentativas. Aguarde alguns minutos e tente novamente.', {
      retryAfter: result.retryAfterSeconds,
    });
  }
}

export interface ClientLimits {
  /** Limite por endereço IP (aplicado só quando o IP é confiável). */
  perIp?: number;
  /**
   * Limite global de proteção (alto): protege recursos do servidor sem que pessoas diferentes
   * bloqueiem umas às outras quando o IP não é conhecido.
   */
  global?: number;
  windowMs: number;
}

export function enforceClientRateLimit(bucket: string, ip: string | null, limits: ClientLimits): void {
  if (ip && limits.perIp) enforceRateLimit(`${bucket}:ip:${ip}`, limits.perIp, limits.windowMs);
  if (limits.global) enforceRateLimit(`${bucket}:global`, limits.global, limits.windowMs);
}

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;

/** Somente para testes. */
export function resetRateLimits(): void {
  buckets.clear();
}

/** Somente para testes. */
export function rateLimitBucketCount(): number {
  return buckets.size;
}
