import 'server-only';
import { hashPassword, normalizeEmail, verifyPassword } from '@relacionamentos/db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminCookieName } from '../cookies';
import { db } from '../db';
import { HttpError } from '../http';
import { checkRateLimit } from '../security/rate-limit';
import { assertSameOrigin } from '../security/request';
import { generateToken, hashToken, isValidTokenFormat } from '../security/tokens';

export const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000; // duração máxima: 8 h
export const ADMIN_IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // inatividade: 2 h
const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;

export interface AdminContext {
  id: string;
  email: string;
  name: string;
  role: string;
  sessionId: string;
}

export type LoginResult =
  | { ok: true; token: string; expiresAt: Date; admin: AdminContext }
  | { ok: false; reason: 'invalid' | 'throttled' };

// Hash "falso" usado quando o e-mail não existe, para que o tempo de resposta seja parecido
// e não revele quais e-mails são administradores.
let dummyHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(generateToken());
  return dummyHash;
}

export async function audit(adminId: string | null, action: string, entity: string, entityId: string | null, summary = '') {
  await db().auditLog.create({
    data: { adminId, action, entity, entityId, summary: summary.slice(0, 500) },
  });
}

export async function loginAdmin(input: {
  email: string;
  password: string;
  /** IP confiável do cliente, ou `null` quando desconhecido (sem limite por IP, nunca um limite global). */
  ip: string | null;
  userAgent: string | null;
}): Promise<LoginResult> {
  const email = normalizeEmail(input.email);
  const byIp = input.ip ? checkRateLimit(`admin-login-ip:${input.ip}`, 20, 15 * 60 * 1000) : null;
  const byEmail = checkRateLimit(`admin-login-email:${hashToken(email)}`, 10, 15 * 60 * 1000);
  if ((byIp && !byIp.allowed) || !byEmail.allowed) return { ok: false, reason: 'throttled' };

  const admin = await db().adminUser.findUnique({ where: { email } });
  if (!admin) {
    await verifyPassword(input.password, await getDummyHash());
    await audit(null, 'login_failed', 'admin', null, 'E-mail não cadastrado');
    return { ok: false, reason: 'invalid' };
  }

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    await audit(admin.id, 'login_blocked', 'admin', admin.id, 'Conta temporariamente bloqueada');
    return { ok: false, reason: 'throttled' };
  }

  if (!(await verifyPassword(input.password, admin.passwordHash))) {
    const failures = admin.failedLogins + 1;
    const locked = failures >= MAX_FAILED_LOGINS;
    await db().adminUser.update({
      where: { id: admin.id },
      data: { failedLogins: locked ? 0 : failures, lockedUntil: locked ? new Date(Date.now() + LOCK_MS) : admin.lockedUntil },
    });
    await audit(admin.id, 'login_failed', 'admin', admin.id, locked ? 'Senha incorreta — conta bloqueada por 15 min' : 'Senha incorreta');
    return { ok: false, reason: locked ? 'throttled' : 'invalid' };
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS);
  const session = await db().$transaction(async (tx) => {
    await tx.adminSession.deleteMany({ where: { adminId: admin.id, expiresAt: { lt: new Date() } } });
    await tx.adminUser.update({
      where: { id: admin.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    return tx.adminSession.create({
      data: {
        tokenHash: hashToken(token),
        adminId: admin.id,
        expiresAt,
        ip: input.ip?.slice(0, 64) ?? null,
        userAgent: input.userAgent?.slice(0, 300) ?? null,
      },
    });
  });
  await audit(admin.id, 'login', 'admin', admin.id, 'Login realizado');

  return {
    ok: true,
    token,
    expiresAt,
    admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role, sessionId: session.id },
  };
}

/** Valida o token de sessão (expiração absoluta + inatividade). */
export async function getAdminFromToken(token: string | undefined | null): Promise<AdminContext | null> {
  if (!isValidTokenFormat(token)) return null;
  const session = await db().adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { admin: true },
  });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now || now - session.lastSeenAt.getTime() > ADMIN_IDLE_TIMEOUT_MS) {
    await db().adminSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (now - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await db().adminSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } });
  }
  const { admin } = session;
  return { id: admin.id, email: admin.email, name: admin.name, role: admin.role, sessionId: session.id };
}

export async function logoutAdmin(token: string | undefined): Promise<void> {
  if (!isValidTokenFormat(token)) return;
  const session = await db().adminSession.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session) return;
  await db().adminSession.delete({ where: { id: session.id } });
  await audit(session.adminId, 'logout', 'admin', session.adminId, 'Logout');
}

/** Para páginas (Server Components) do painel: redireciona para o login se não houver sessão válida. */
export async function requireAdminPage(): Promise<AdminContext> {
  const token = (await cookies()).get(adminCookieName())?.value;
  const admin = await getAdminFromToken(token);
  if (!admin) redirect('/admin/login');
  return admin;
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

/**
 * Para rotas de API do painel: exige sessão válida e, em métodos que alteram dados, a verificação
 * de origem (CSRF). A autorização é checada em TODA rota — o `proxy.ts` é apenas uma primeira barreira.
 */
export async function requireAdminApi(request: Request): Promise<AdminContext> {
  if (!['GET', 'HEAD'].includes(request.method)) assertSameOrigin(request);
  const admin = await getAdminFromToken(readCookie(request, adminCookieName()));
  if (!admin) throw new HttpError(401, 'unauthorized', 'Sessão expirada. Faça login novamente.');
  return admin;
}

export function getAdminTokenFromRequest(request: Request): string | undefined {
  return readCookie(request, adminCookieName());
}
