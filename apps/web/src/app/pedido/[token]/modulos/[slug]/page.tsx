import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { VideoLesson } from '@/components/course/VideoLesson';
import { SafeMarkdown } from '@/components/SafeMarkdown';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { Icon } from '@/components/ui/Icon';
import { getPurchasedModule } from '@/server/services/checkout-service';

export const metadata: Metadata = { title: 'Módulo', robots: { index: false, follow: false } };

/** Aulas em vídeo + texto completo — liberados apenas para pedidos pagos que incluem o módulo. */
export default async function ModuleReaderPage({ params }: { params: Promise<{ token: string; slug: string }> }) {
  const { token, slug } = await params;
  const bookModule = await getPurchasedModule(token, slug);
  if (!bookModule) notFound();

  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
          <Link href={`/pedido/${token}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
            <Icon name="arrowLeft" className="h-4 w-4" /> Voltar ao pedido
          </Link>
          <header className="mt-6">
            <span className="text-5xl" aria-hidden="true">{bookModule.coverEmoji}</span>
            <p className="mt-3 text-sm font-medium text-brand-700">{bookModule.subtitle}</p>
            <h1 className="mt-1 text-3xl font-bold text-night-900">{bookModule.title}</h1>
          </header>

          {bookModule.videos.length ? (
            <section aria-labelledby="aulas" className="mt-8">
              <h2 id="aulas" className="flex items-center gap-2 text-xl font-bold text-night-900">
                <Icon name="video" className="h-5 w-5 text-brand-600" /> Aulas em vídeo
              </h2>
              <p className="mt-1 text-sm text-slate-600">Vídeos curtos, de cerca de 1 minuto, para assistir no seu ritmo.</p>
              <div className="mt-4 space-y-5">
                {bookModule.videos.map((lesson, index) => (
                  <VideoLesson key={lesson.id} lesson={lesson} index={index} />
                ))}
              </div>
            </section>
          ) : null}

          <article aria-labelledby="texto" className="mt-10 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h2 id="texto" className="flex items-center gap-2 text-xl font-bold text-night-900">
              <Icon name="book" className="h-5 w-5 text-brand-600" /> Texto do módulo
            </h2>
            <div className="mt-4 text-slate-800">
              <SafeMarkdown source={bookModule.content} />
            </div>
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
