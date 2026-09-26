import type { ClientEventName } from '@relacionamentos/analytics';

/** Consentimento de analytics (LGPD). "analytics" = aceitou métricas; "essential" = só o necessário. */
export type ConsentValue = 'analytics' | 'essential';

const COOKIE = 'rq_consent';
const listeners = new Set<() => void>();

export function readConsent(): ConsentValue | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((part) => part.startsWith(`${COOKIE}=`));
  const value = match?.split('=')[1];
  return value === 'analytics' || value === 'essential' ? value : null;
}

export function writeConsent(value: ConsentValue): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE}=${value}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax${secure}`;
  listeners.forEach((listener) => listener());
}

/** Assinatura para `useSyncExternalStore` (o banner reage quando a escolha muda). */
export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Envia um evento de uso — somente com consentimento. Nunca envia dados pessoais. */
export function trackClientEvent(name: ClientEventName, props: Record<string, unknown>): void {
  if (readConsent() !== 'analytics') return;
  void fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, props }),
    credentials: 'same-origin',
    keepalive: true,
  }).catch(() => undefined);
}
