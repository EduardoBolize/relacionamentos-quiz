import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SafeMarkdown } from '@/components/SafeMarkdown';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { Icon } from '@/components/ui/Icon';
import { getPurchasedModule } from '@/server/services/checkout-service';

export const metadata: Metadata = { title: 'Leitura', robots: { index: false, follow: false } };

/** Conteúdo completo — liberado apenas para pedidos pagos que incluem a seção. */
export default async function ReaderPage({ params }: { params: Promise<{ token: string; slug: string }> }) {
  const { token, slug } = await params;
  const bookModule = await getPurchasedModule(token, slug);
  if (!bookModule) notFound();

  return (
    <>
      <SiteHeader />
      <main id="conteudo">
        <article className="mx-auto max-w-3xl px-4 py-12">
          <Link href={`/pedido/${token}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
            <Icon name="arrowLeft" className="h-4 w-4" /> Voltar ao pedido
          </Link>
          <header className="mt-6 border-b border-slate-200 pb-6">
            <span className="text-5xl" aria-hidden="true">{bookModule.coverEmoji}</span>
            <p className="mt-3 text-sm font-medium text-brand-700">{bookModule.subtitle}</p>
            <h1 className="mt-1 text-3xl font-bold text-night-900">{bookModule.title}</h1>
          </header>
          <div className="mt-8 text-slate-800">
            <SafeMarkdown source={bookModule.content} />
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
