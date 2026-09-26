'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/site/SiteHeader';
import { ProgressBar } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { ApiError, apiFetch } from '@/lib/api-client';
import type { QuizSessionLookupDTO, QuizStateDTO, StepDTO } from '@/lib/dto';
import { StepView } from './StepView';

type Phase =
  | { name: 'loading' }
  | { name: 'intro'; expired?: boolean }
  | { name: 'completed'; resultPath: string }
  | { name: 'step'; state: Extract<QuizStateDTO, { status: 'in_progress' }> }
  | { name: 'finishing' }
  | { name: 'error'; message: string };

export function QuizRunner({ startFresh = false }: { startFresh?: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const shownAt = useRef(0);
  const lastStageId = useRef<string | null>(null);

  const showState = useCallback(
    (state: QuizStateDTO) => {
      setError(null);
      if (state.status === 'completed') {
        setPhase({ name: 'finishing' });
        setAnnouncement('Teste concluído. Calculando seus resultados.');
        window.setTimeout(() => router.push(state.resultPath), 900);
        return;
      }
      setSelected(state.step.selected);
      shownAt.current = Date.now();
      if (state.step.stage.id !== lastStageId.current) {
        lastStageId.current = state.step.stage.id;
        setAnnouncement(`Etapa ${state.step.stage.index + 1} de ${state.step.stage.count}: ${state.step.stage.title}`);
      }
      setPhase({ name: 'step', state });
    },
    [router],
  );

  const start = useCallback(async () => {
    setBusy(true);
    try {
      showState(await apiFetch<QuizStateDTO>('/api/quiz/session', { body: { source: 'quiz_page' } }));
    } catch (err) {
      setPhase({ name: 'error', message: err instanceof ApiError ? err.message : 'Não foi possível iniciar o teste.' });
    } finally {
      setBusy(false);
    }
  }, [showState]);

  // Retoma a sessão existente (se houver) ao abrir a página. O ref evita duas execuções no
  // StrictMode do React (que criariam duas sessões).
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      if (startFresh) {
        router.replace('/quiz', { scroll: false });
        return start();
      }
      try {
        const state = await apiFetch<QuizSessionLookupDTO>('/api/quiz/session');
        if (state.status === 'none') setPhase({ name: 'intro' });
        else if (state.status === 'completed') setPhase({ name: 'completed', resultPath: state.resultPath });
        else showState(state);
      } catch {
        setPhase({ name: 'error', message: 'Não foi possível carregar o teste.' });
      }
    })();
  }, [router, showState, start, startFresh]);

  const submit = useCallback(
    async (optionIds: string[]) => {
      if (phase.name !== 'step' || busy) return;
      const step = phase.state.step;
      if (step.required && optionIds.length === 0) {
        setError('Escolha uma opção para continuar.');
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const state = await apiFetch<QuizStateDTO>('/api/quiz/session/answer', {
          body: { stepId: step.id, optionIds, msOnStep: Math.min(Date.now() - shownAt.current, 3_600_000) },
        });
        showState(state);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) setPhase({ name: 'intro', expired: true });
        else if (err instanceof ApiError && err.code === 'quiz_completed') router.refresh();
        else setError(err instanceof ApiError ? err.message : 'Não foi possível salvar sua resposta.');
      } finally {
        setBusy(false);
      }
    },
    [busy, phase, router, showState],
  );

  const goBack = useCallback(async () => {
    if (phase.name !== 'step' || busy || phase.state.step.isFirst) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({ at: phase.state.step.id, dir: 'prev' });
      showState(await apiFetch<QuizStateDTO>(`/api/quiz/session?${params}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível voltar.');
    } finally {
      setBusy(false);
    }
  }, [busy, phase, showState]);

  const restart = useCallback(async () => {
    if (!window.confirm('Recomeçar o teste do início? As respostas atuais serão descartadas.')) return;
    lastStageId.current = null;
    await start();
  }, [start]);

  const step: StepDTO | null = phase.name === 'step' ? phase.state.step : null;
  const progress = phase.name === 'step' ? phase.state.progress : null;

  return (
    <div className="flex min-h-dvh flex-col bg-night-900 text-white">
      <header className="border-b border-white/5">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/" aria-label="Sair do teste e voltar à página inicial">
            <Logo />
          </Link>
          {step ? (
            <p className="hidden truncate text-sm text-night-200 sm:block">
              Etapa {step.stage.index + 1} de {step.stage.count} · <span className="text-white">{step.stage.title}</span>
            </p>
          ) : null}
          {phase.name === 'step' ? (
            <button type="button" onClick={restart} className="text-sm text-night-300 underline-offset-4 hover:text-white hover:underline">
              Recomeçar
            </button>
          ) : (
            <span />
          )}
        </div>
        {progress && step ? (
          <ProgressBar
            value={progress.percent}
            label="Progresso do teste"
            valueText={`${progress.percent}% concluído — etapa ${step.stage.index + 1} de ${step.stage.count}`}
            className="h-1.5 rounded-none"
            trackClassName="bg-night-700"
            barClassName="bg-brand-500"
          />
        ) : null}
      </header>

      <main id="conteudo" className="flex flex-1 items-center px-4 py-10 pb-28">
        {phase.name === 'loading' ? (
          <p className="mx-auto flex items-center gap-3 text-night-200" role="status">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" aria-hidden="true" />
            Carregando…
          </p>
        ) : null}

        {phase.name === 'intro' ? <Intro onStart={start} busy={busy} expired={phase.expired} /> : null}

        {phase.name === 'completed' ? (
          <div className="animate-fade-up mx-auto max-w-xl text-center">
            <h1 className="text-2xl font-bold sm:text-3xl">Você já concluiu o teste</h1>
            <p className="mt-3 text-night-200">Quer ver o resultado novamente ou fazer o teste do zero?</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href={phase.resultPath} className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-6 py-3 font-semibold hover:bg-brand-400">
                Ver meu resultado
              </Link>
              <button type="button" onClick={start} className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/30 px-6 py-3 font-semibold hover:bg-white/10">
                Refazer o teste
              </button>
            </div>
          </div>
        ) : null}

        {phase.name === 'finishing' ? (
          <div className="mx-auto text-center" role="status">
            <span className="mx-auto block h-12 w-12 animate-spin rounded-full border-4 border-brand-400 border-t-transparent" aria-hidden="true" />
            <p className="mt-6 text-xl font-semibold">Analisando suas respostas…</p>
            <p className="mt-2 text-night-200">Em instantes você verá os temas em destaque.</p>
          </div>
        ) : null}

        {phase.name === 'error' ? (
          <div className="mx-auto max-w-md text-center" role="alert">
            <h1 className="text-2xl font-bold">Algo deu errado</h1>
            <p className="mt-3 text-night-200">{phase.message}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-full bg-brand-500 px-6 py-3 font-semibold hover:bg-brand-400">
              Tentar novamente
            </button>
          </div>
        ) : null}

        {step ? (
          <StepView
            step={step}
            selected={selected}
            onChange={(ids) => {
              setError(null);
              setSelected(ids);
            }}
            onPick={(ids) => {
              setSelected(ids);
              window.setTimeout(() => void submit(ids), 220);
            }}
            onSubmit={() => void submit(selected)}
            busy={busy}
            error={error}
          />
        ) : null}
      </main>

      {step ? (
        <nav aria-label="Navegação entre perguntas" className="fixed right-4 bottom-4 flex overflow-hidden rounded-xl shadow-lg">
          <button
            type="button"
            onClick={goBack}
            disabled={busy || step.isFirst}
            aria-label="Pergunta anterior"
            className="grid h-11 w-11 place-items-center bg-night-700 text-white hover:bg-night-600 disabled:opacity-40"
          >
            <Icon name="chevronUp" />
          </button>
          <button
            type="button"
            onClick={() => void submit(selected)}
            disabled={busy || (step.required && selected.length === 0)}
            aria-label="Próxima pergunta"
            className="grid h-11 w-11 place-items-center border-l border-night-900 bg-mint-600 text-white hover:bg-mint-500 disabled:opacity-40"
          >
            <Icon name="chevronDown" />
          </button>
        </nav>
      ) : null}

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

function Intro({ onStart, busy, expired }: { onStart: () => void; busy: boolean; expired?: boolean }) {
  return (
    <div className="animate-fade-up mx-auto w-full max-w-xl">
      {expired ? (
        <p role="alert" className="mb-6 rounded-lg bg-amber-500/15 px-4 py-3 text-sm text-amber-100">
          Sua sessão anterior expirou. Você pode começar de novo quando quiser.
        </p>
      ) : null}
      <p className="text-sm font-semibold tracking-wide text-brand-300 uppercase">Análise de relacionamento</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Vamos começar?</h1>
      <ul className="mt-6 space-y-3 text-night-100">
        {[
          'Leva cerca de 5 minutos. Você pode voltar e mudar respostas quando quiser.',
          'As perguntas se adaptam ao seu momento — algumas só aparecem quando fazem sentido.',
          'Ao final de cada etapa, mostramos a seção do livro relacionada e perguntamos se o valor faz sentido para você (sem nenhuma cobrança).',
          'Seu progresso fica salvo neste navegador. Não pedimos nome nem cadastro.',
        ].map((item) => (
          <li key={item} className="flex gap-3">
            <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" /> <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 rounded-xl bg-white/5 p-4 text-sm text-night-200">
        Este teste é uma ferramenta de reflexão, <strong className="text-white">não um diagnóstico</strong>. Ao continuar,
        você concorda com o uso das respostas para gerar seu resultado, conforme a{' '}
        <Link href="/privacidade" className="text-brand-300 underline">
          política de privacidade
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={onStart}
        disabled={busy}
        className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-500 px-8 py-3 text-lg font-semibold uppercase tracking-wide hover:bg-brand-400 disabled:opacity-60"
      >
        {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" /> : null}
        Começar agora <Icon name="arrowRight" />
      </button>
    </div>
  );
}
