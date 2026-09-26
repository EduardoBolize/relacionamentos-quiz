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

const globalStore = globalThis as unknown as { __rqRateLimit?: Map<string, Bucket> };
const buckets = (globalStore.__rqRateLimit ??= new Map<string, Bucket>());

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  if (buckets.size > 10_000) {
    for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(bucketKey);
  }

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
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

/** Somente para testes. */
export function resetRateLimits(): void {
  buckets.clear();
}
