import type { Metadata } from 'next';
import { RecoveryConfirm } from '@/components/result/RecoveryForms';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';

export const metadata: Metadata = { title: 'Acessar resultados', robots: { index: false, follow: false } };

export default async function RecoverConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="bg-slate-50">
        <div className="mx-auto max-w-xl px-4 py-14">
          <h1 className="text-2xl font-bold text-night-900 sm:text-3xl">Acessar meus resultados</h1>
          <p className="mt-2 text-slate-600">Este link é pessoal, vale por 30 minutos e só pode ser usado uma vez.</p>
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <RecoveryConfirm token={token} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
