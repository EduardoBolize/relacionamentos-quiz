import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SafeMarkdown } from '@/components/SafeMarkdown';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { TrackOnMount } from '@/components/TrackOnMount';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatBRL } from '@/lib/format';
import { db } from '@/server/db';

async function findModule(slug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  return db().bookModule.findFirst({ where: { slug, active: true } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const bookModule = await findModule((await params).slug);
  return bookModule ? { title: bookModule.title, description: bookModule.description } : { title: 'Seção não encontrada' };
}

export default async function ModulePreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const bookModule = await findModule((await params).slug);
  if (!bookModule) notFound();

  return (
    <>
      <SiteHeader />
      <TrackOnMount name="module_preview_opened" props={{ moduleId: bookModule.id, origin: 'module_page' }} />
      <main id="conteudo">
        <section className="bg-night-900 text-white">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
            <span className="text-5xl" aria-hidden="true">{bookModule.coverEmoji}</span>
            <p className="mt-4 text-sm font-medium text-brand-300">{bookModule.subtitle}</p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{bookModule.title}</h1>
            <p className="mt-3 text-lg text-night-100">{bookModule.description}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <span className="font-display text-3xl font-extrabold">{formatBRL(bookModule.priceCents)}</span>
              <ButtonLink href={`/checkout?modulos=${bookModule.slug}`} variant="onDark" size="lg">
                Quero esta seção <Icon name="arrowRight" />
              </ButtonLink>
            </div>
          </div>
        </section>

        <article className="mx-auto max-w-3xl px-4 py-12">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-800">
            <Icon name="eye" className="h-4 w-4" /> Prévia gratuita
          </p>
          <SafeMarkdown source={bookModule.previewContent} />
          <div className="mt-10 rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
            <h2 className="flex items-center gap-2 text-lg font-bold text-night-900">
              <Icon name="lock" className="h-5 w-5 text-brand-600" /> No conteúdo completo
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              O texto integral da seção, exercícios práticos para fazer sozinho(a) ou a dois e sugestões de conversa. Acesso
              imediato após a confirmação do pagamento.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink href={`/checkout?modulos=${bookModule.slug}`}>Comprar por {formatBRL(bookModule.priceCents)}</ButtonLink>
              <ButtonLink href="/quiz" variant="secondary">
                Fazer o teste primeiro
              </ButtonLink>
            </div>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
