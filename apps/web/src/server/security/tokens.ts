import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

/**
 * Tokens de acesso (resultado, pedido, recuperação, sessão admin): 256 bits aleatórios em base64url.
 * No banco guardamos apenas o SHA-256 — um vazamento do banco não expõe links válidos.
 * (Com 256 bits de entropia, um hash rápido é suficiente; não é necessário "salt".)
 */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Formato esperado (43 caracteres base64url). Evita consultas ao banco com lixo. */
export function isValidTokenFormat(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
}
