import type { Metadata } from 'next';
import Link from 'next/link';
import { RecoveryRequestForm } from '@/components/result/RecoveryForms';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';

export const metadata: Metadata = { title: 'Recuperar resultado', robots: { index: false } };

export default function RecoverPage() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="bg-slate-50">
        <div className="mx-auto max-w-xl px-4 py-14">
          <h1 className="text-2xl font-bold text-night-900 sm:text-3xl">Recuperar meu resultado</h1>
          <p className="mt-2 text-slate-600">
            Se você cadastrou um e-mail na página do resultado, enviaremos um link de acesso seguro para ele.
          </p>
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <RecoveryRequestForm />
          </div>
          <div className="mt-8 space-y-2 text-sm text-slate-600">
            <p>
              <strong>Está no mesmo navegador em que fez o teste?</strong>{' '}
              <Link href="/resultado" className="font-medium text-brand-700 underline">Abra seu último resultado</Link>.
            </p>
            <p>
              <strong>Não cadastrou e-mail?</strong> Use o link copiado da página do resultado ou{' '}
              <Link href="/quiz?novo=1" className="font-medium text-brand-700 underline">faça o teste novamente</Link>.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
