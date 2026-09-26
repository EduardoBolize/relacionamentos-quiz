import 'server-only';
import { isProduction } from './env';

/** Nomes e opções dos cookies da aplicação. Todos com `HttpOnly` exceto o de consentimento. */

export function quizCookieName(): string {
  return isProduction() ? '__Host-rq_quiz' : 'rq_quiz';
}

export function adminCookieName(): string {
  return isProduction() ? '__Host-rq_admin' : 'rq_admin';
}

/** Cookie de consentimento (lido também no navegador para esconder o banner). */
export const CONSENT_COOKIE = 'rq_consent';

export const QUIZ_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

export function quizCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: QUIZ_COOKIE_MAX_AGE,
  };
}

export function adminCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'strict' as const,
    path: '/',
    expires,
  };
}

interface CookieWriter {
  cookies: { set: (name: string, value: string, options: Record<string, unknown>) => unknown };
}

/**
 * Remove o cookie repetindo os atributos originais. Cookies `__Host-` só são aceitos (inclusive para
 * remoção) com `Secure` e `Path=/` — o `cookies.delete()` padrão não os envia.
 */
export function clearQuizCookie(response: CookieWriter): void {
  response.cookies.set(quizCookieName(), '', { ...quizCookieOptions(), maxAge: 0, expires: new Date(0) });
}

export function clearAdminCookie(response: CookieWriter): void {
  response.cookies.set(adminCookieName(), '', { ...adminCookieOptions(new Date(0)), maxAge: 0 });
}

/** Consentimento para analytics comportamental (LGPD). */
export function hasAnalyticsConsent(cookieValue: string | undefined): boolean {
  return cookieValue === 'analytics';
}
