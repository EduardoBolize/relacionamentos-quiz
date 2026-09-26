'use client';

import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="conteudo" className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-night-900">Algo deu errado</h1>
      <p className="mt-2 text-slate-600">Tente novamente em instantes. Suas respostas já salvas não foram perdidas.</p>
      {error.digest ? <p className="mt-2 text-xs text-slate-400">Código: {error.digest}</p> : null}
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex min-h-11 items-center rounded-full bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-700"
      >
        Tentar novamente
      </button>
    </main>
  );
}
