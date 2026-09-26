'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ApiError, apiFetch } from '@/lib/api-client';

/** Consulta o status enquanto o pagamento está pendente e atualiza a página quando muda. */
export function OrderStatusPoller({ token, status }: { token: string; status: string }) {
  const router = useRouter();
  useEffect(() => {
    if (status !== 'pending') return;
    let active = true;
    const interval = window.setInterval(async () => {
      try {
        const next = await apiFetch<{ status: string }>(`/api/orders/${token}`);
        if (active && next.status !== status) router.refresh();
      } catch {
        // tenta de novo no próximo ciclo
      }
    }, 4000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [router, status, token]);
  return null;
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      }}
    >
      <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4" />
      {copied ? 'Copiado!' : label}
    </Button>
  );
}

function subscribeClock(onTick: () => void): () => void {
  const interval = window.setInterval(onTick, 1000);
  return () => window.clearInterval(interval);
}
const currentSecond = () => Math.floor(Date.now() / 1000);
const noClockOnServer = () => null;

export function Countdown({ until }: { until: string }) {
  // No servidor não há relógio: mostra "--:--" e o navegador assume depois (sem divergência de hidratação).
  const nowSeconds = useSyncExternalStore(subscribeClock, currentSecond, noClockOnServer);
  if (nowSeconds === null) return <span className="font-mono tabular-nums">--:--</span>;
  const remaining = Math.max(0, new Date(until).getTime() - nowSeconds * 1000);
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return (
    <span className="font-mono tabular-nums" aria-live="off">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}

/** SOMENTE DESENVOLVIMENTO: dispara um webhook assinado como se viesse do provedor. */
export function SimulatorPanel({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const simulate = async (outcome: 'paid' | 'failed' | 'expired') => {
    setBusy(outcome);
    setError(null);
    try {
      await apiFetch('/api/dev/payments/simulate', { body: { orderToken: token, outcome } });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha na simulação.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-label="Simulador de pagamento" className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-5">
      <p className="text-sm font-bold text-amber-900">Simulador de pagamento (somente desenvolvimento)</p>
      <p className="mt-1 text-sm text-amber-900">
        Em produção, a confirmação chega pelo webhook do provedor. Aqui você dispara esse webhook manualmente.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="success" size="sm" loading={busy === 'paid'} disabled={busy !== null} onClick={() => simulate('paid')}>
          Simular pagamento aprovado
        </Button>
        <Button variant="danger" size="sm" loading={busy === 'failed'} disabled={busy !== null} onClick={() => simulate('failed')}>
          Simular recusa
        </Button>
        <Button variant="secondary" size="sm" loading={busy === 'expired'} disabled={busy !== null} onClick={() => simulate('expired')}>
          Simular expiração
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-700" role="alert">{error}</p> : null}
    </section>
  );
}
