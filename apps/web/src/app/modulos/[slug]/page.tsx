import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BuyLink } from '@/components/course/BuyLink';
import { VideoLesson } from '@/components/course/VideoLesson';
import { SafeMarkdown } from '@/components/SafeMarkdown';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { TrackOnMount } from '@/components/TrackOnMount';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatBRL } from '@/lib/format';
import { formatDuration } from '@/lib/video';
import { db } from '@/server/db';
import { getOfferInfo, installmentText, moduleCheckoutHref } from '@/server/offer';

async function findModule(slug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  return db().bookModule.findFirst({
    where: { slug, active: true },
    include: { videos: { where: { active: true }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const bookModule = await findModule((await params).slug);
  return bookModule ? { title: bookModule.title, description: bookModule.description } : { title: 'Módulo não encontrado' };
}

export default async function ModulePreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const [bookModule, offer] = await Promise.all([findModule((await params).slug), getOfferInfo()]);
  if (!bookModule) notFound();

  const buy = moduleCheckoutHref(bookModule);
  const installments = installmentText(offer);
  const sample = bookModule.videos.find((video) => video.isPreview) ?? null;
  const totalSeconds = bookModule.videos.reduce((sum, video) => sum + video.durationSeconds, 0);

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
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-night-200">
              <span className="flex items-center gap-1.5">
                <Icon name="video" className="h-4 w-4 text-brand-300" /> {bookModule.videos.length} aulas em vídeo
                {totalSeconds ? ` (${formatDuration(totalSeconds)} no total)` : ''}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="book" className="h-4 w-4 text-brand-300" /> Texto completo com exercícios
              </span>
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <span className="font-display text-3xl font-extrabold">{formatBRL(bookModule.priceCents)}</span>
              <BuyLink href={buy.href} external={buy.external} variant="onDark" size="lg">
                Quero este módulo
              </BuyLink>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-3xl space-y-10 px-4 py-12">
          {sample ? (
            <section aria-labelledby="amostra">
              <h2 id="amostra" className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-800">
                <Icon name="play" className="h-4 w-4" /> Aula grátis
              </h2>
              <VideoLesson lesson={sample} index={bookModule.videos.indexOf(sample)} />
            </section>
          ) : null}

          <section aria-labelledby="aulas">
            <h2 id="aulas" className="text-xl font-bold text-night-900">Aulas deste módulo</h2>
            <ol className="mt-4 divide-y divide-slate-200 rounded-2xl ring-1 ring-slate-200">
              {bookModule.videos.map((video, index) => (
                <li key={video.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 font-medium text-slate-900">{video.title}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Icon name={video.isPreview ? 'eye' : 'lock'} className="h-3.5 w-3.5" />
                    {video.isPreview ? 'Grátis · ' : ''}
                    {formatDuration(video.durationSeconds)}
                  </span>
                </li>
              ))}
              <li className="flex items-center gap-3 px-4 py-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
                  <Icon name="book" className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 font-medium text-slate-900">Texto completo, resumo e exercícios práticos</span>
                <Icon name="lock" className="h-3.5 w-3.5 text-slate-500" />
              </li>
            </ol>
          </section>

          <article aria-labelledby="previa">
            <h2 id="previa" className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-800">
              <Icon name="eye" className="h-4 w-4" /> Prévia gratuita
            </h2>
            <SafeMarkdown source={bookModule.previewContent} />
          </article>

          <section className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
            <h2 className="flex items-center gap-2 text-lg font-bold text-night-900">
              <Icon name="lock" className="h-5 w-5 text-brand-600" /> Liberado após a compra
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Todas as aulas em vídeo e o texto completo do módulo, com resumo e exercícios para praticar. Acesso imediato após a
              confirmação do pagamento{offer.guaranteeDays ? `, com garantia de ${offer.guaranteeDays} dias` : ''}.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <BuyLink href={buy.href} external={buy.external}>
                Comprar por {formatBRL(bookModule.priceCents)}
              </BuyLink>
              <ButtonLink href="/quiz" variant="secondary">
                Descobrir meu módulo ideal
              </ButtonLink>
            </div>
            {offer.moduleCount > 1 ? (
              <p className="mt-4 text-sm text-slate-600">
                Ou leve o curso completo, com os {offer.moduleCount} módulos, por {formatBRL(offer.courseTotalCents)}
                {installments ? ` (${installments})` : ''}:{' '}
                <a href={offer.fullCourseHref} className="font-semibold text-brand-700 underline">
                  quero o curso completo
                </a>
                .
              </p>
            ) : null}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
