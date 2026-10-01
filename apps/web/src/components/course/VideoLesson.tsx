import { Icon } from '@/components/ui/Icon';
import { formatDuration, parseVideoUrl } from '@/lib/video';

export interface VideoLessonData {
  id: string;
  title: string;
  durationSeconds: number;
  script: string;
  keyPoints: string;
  videoUrl: string | null;
}

/**
 * Player da aula (YouTube, Vimeo, Panda Video ou .mp4). Sem vídeo cadastrado, mostra os destaques
 * da aula como cartão "em produção". A transcrição fica sempre disponível (acessibilidade).
 */
export function VideoPlayer({ lesson }: { lesson: VideoLessonData }) {
  const source = parseVideoUrl(lesson.videoUrl);

  if (source?.kind === 'iframe') {
    return (
      <iframe
        src={source.src}
        title={`Vídeo: ${lesson.title}`}
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        // só a origem (sem o token da URL) é enviada; o YouTube exige o Referer para tocar
        referrerPolicy="strict-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        className="aspect-video w-full rounded-xl bg-black"
      />
    );
  }
  if (source?.kind === 'file') {
    return (
      <video controls preload="metadata" playsInline className="aspect-video w-full rounded-xl bg-black" aria-label={`Vídeo: ${lesson.title}`}>
        <source src={source.src} />
        Seu navegador não conseguiu reproduzir o vídeo. Leia a transcrição abaixo.
      </video>
    );
  }

  const points = lesson.keyPoints.split('\n').map((line) => line.trim()).filter(Boolean);
  return (
    <div className="flex aspect-video w-full flex-col justify-center rounded-xl bg-gradient-to-br from-night-800 to-night-950 p-5 text-white sm:p-8">
      <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-brand-300 uppercase">
        <Icon name="video" className="h-4 w-4" /> Vídeo em produção
      </p>
      <p className="mt-2 font-display text-lg font-bold sm:text-2xl">{lesson.title}</p>
      {points.length ? (
        <ul className="mt-3 space-y-1 text-sm text-night-100 sm:text-base">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2">
              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
              {point}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Aula completa: número, título, duração, player e transcrição. */
export function VideoLesson({ lesson, index }: { lesson: VideoLessonData; index: number }) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-base font-bold text-night-900 sm:text-lg">
          <span className="text-brand-600">Aula {index + 1}.</span> {lesson.title}
        </h3>
        <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
          <Icon name="clock" className="h-3.5 w-3.5" /> {formatDuration(lesson.durationSeconds)}
        </span>
      </header>
      <VideoPlayer lesson={lesson} />
      {lesson.script ? (
        <details className="group mt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
            <Icon name="chevronDown" className="h-4 w-4 transition-transform group-open:rotate-180" /> Ler a transcrição
          </summary>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">
            {lesson.script.split(/\n{2,}/).map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex}>{paragraph}</p>
            ))}
          </div>
        </details>
      ) : null}
    </article>
  );
}
