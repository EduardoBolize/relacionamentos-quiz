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

/** Consentimento para analytics comportamental (LGPD). */
export function hasAnalyticsConsent(cookieValue: string | undefined): boolean {
  return cookieValue === 'analytics';
}
