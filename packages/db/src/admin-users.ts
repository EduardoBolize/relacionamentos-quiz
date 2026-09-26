import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import type { PrismaClient } from './generated/prisma/client';

/**
 * Hash de senhas com scrypt (parâmetros recomendados pela OWASP: N=2^17, r=8, p=1).
 * Formato armazenado: `scrypt$<log2N>$<r>$<p>$<salt base64>$<hash base64>` — os parâmetros
 * ficam junto do hash, então é possível aumentar o custo no futuro sem invalidar senhas antigas.
 */

const KEY_LENGTH = 64;
const DEFAULT_LOG_N = 17;

function scrypt(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password.normalize('NFKC'), salt, KEY_LENGTH, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

const optionsFor = (logN: number, r: number, p: number): ScryptOptions => ({
  N: 2 ** logN,
  r,
  p,
  maxmem: 256 * 1024 * 1024,
});

export async function hashPassword(password: string, { logN = DEFAULT_LOG_N } = {}): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, optionsFor(logN, 8, 1));
  return `scrypt$${logN}$8$1$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, logN, r, p, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !logN || !r || !p || !saltB64 || !hashB64) return false;
  const params = [Number(logN), Number(r), Number(p)];
  if (params.some((value) => !Number.isInteger(value) || value < 1) || Number(logN) > 20) return false;

  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), optionsFor(params[0]!, params[1]!, params[2]!));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const COMMON_PASSWORDS = new Set([
  '123456789012',
  '1234567890123',
  'password1234',
  'password12345',
  'senha1234567',
  'senha12345678',
  'admin1234567',
  'administrador',
  'qwertyuiop12',
  'trocar-esta-senha',
  'troque-esta-senha',
]);

/** Retorna uma mensagem de erro, ou `null` se a senha for aceitável. */
export function checkPasswordStrength(password: string): string | null {
  if (password.length < 12) return 'A senha precisa ter pelo menos 12 caracteres.';
  if (password.length > 200) return 'A senha pode ter no máximo 200 caracteres.';
  if (/^(.)\1+$/.test(password)) return 'A senha não pode repetir um único caractere.';
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return 'Esta senha é muito comum. Escolha outra.';
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createAdminUser(
  prisma: PrismaClient,
  input: { email: string; name: string; password: string },
  options: { logN?: number } = {},
) {
  const problem = checkPasswordStrength(input.password);
  if (problem) throw new Error(problem);
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail inválido.');

  return prisma.adminUser.create({
    data: {
      email,
      name: input.name.trim() || 'Administrador',
      passwordHash: await hashPassword(input.password, options),
    },
  });
}
