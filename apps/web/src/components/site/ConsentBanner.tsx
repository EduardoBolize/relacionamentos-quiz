'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { readConsent, subscribeConsent, writeConsent } from '@/lib/consent';
import { Button } from '@/components/ui/Button';

/** Durante a renderização no servidor não sabemos a escolha: o banner só aparece no navegador. */
const serverSnapshot = () => 'server' as const;

/** Banner de consentimento (LGPD): métricas de uso só com autorização explícita. */
export function ConsentBanner() {
  const pathname = usePathname();
  const consent = useSyncExternalStore(subscribeConsent, readConsent, serverSnapshot);
  // O painel é usado pela equipe e não registra métricas de uso: o banner não se aplica.
  if (consent !== null || pathname.startsWith('/admin')) return null;

  return (
    <>
      {/* Espaço extra no fim da página: nada fica escondido atrás do banner fixo. */}
      <div aria-hidden="true" className="h-48 sm:h-32" />
      <div
        role="region"
        aria-label="Preferências de privacidade"
        className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-2xl sm:p-5"
      >
        <p className="text-sm leading-relaxed">
          Usamos cookies essenciais para salvar o seu progresso no quiz. Com a sua permissão, também registramos métricas
          anônimas de uso para melhorar a experiência — nunca suas respostas ou dados pessoais.{' '}
          <Link href="/privacidade" className="font-medium text-brand-700 underline">
            Saiba mais
          </Link>
          .
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" size="sm" onClick={() => writeConsent('essential')}>
            Somente essenciais
          </Button>
          <Button size="sm" onClick={() => writeConsent('analytics')}>
            Aceitar métricas anônimas
          </Button>
        </div>
      </div>
    </>
  );
}
