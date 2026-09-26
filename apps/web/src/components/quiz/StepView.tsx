'use client';

import Link from 'next/link';
import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { StepDTO } from '@/lib/dto';
import { formatBRL } from '@/lib/format';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

interface StepViewProps {
  step: StepDTO;
  selected: string[];
  onChange: (optionIds: string[]) => void;
  /** Envio imediato (clique em opção única / escala). */
  onPick: (optionIds: string[]) => void;
  onSubmit: () => void;
  busy: boolean;
  error: string | null;
}

/**
 * Uma pergunta por tela. Opções são `radio`/`checkbox` nativos (navegáveis por setas e lidos
 * corretamente por leitores de tela), com visual de botões grandes. Atalhos: letras (A, B, C…) ou
 * números selecionam; Enter confirma. Clique/toque em escolha única avança automaticamente.
 */
export function StepView({ step, selected, onChange, onPick, onSubmit, busy, error }: StepViewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isMultiple = step.type === 'multiple';
  const isScale = step.type === 'scale';
  const max = isMultiple ? (step.maxSelections ?? step.options.length) : 1;

  useEffect(() => {
    // Foco no enunciado (leitores de tela anunciam a nova pergunta) sem pular o card do módulo.
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [step.id]);

  const toggle = (optionId: string) => {
    if (!isMultiple) return onChange([optionId]);
    if (selected.includes(optionId)) return onChange(selected.filter((id) => id !== optionId));
    if (selected.length >= max) return;
    onChange([...selected, optionId]);
  };

  const handleClick = (event: MouseEvent<HTMLInputElement>, optionId: string) => {
    // `detail > 0` = clique/toque real (setas do teclado também disparam "click", com detail 0)
    if (!isMultiple && event.detail > 0 && !busy) onPick([optionId]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement;
    if (target.tagName === 'A' || target.tagName === 'BUTTON') return;
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!busy) onSubmit();
      return;
    }
    const key = event.key.toUpperCase();
    const index = isScale ? step.options.findIndex((option) => option.label === event.key) : LETTERS.indexOf(key);
    const option = index >= 0 ? step.options[index] : undefined;
    if (option && key.length === 1) {
      event.preventDefault();
      toggle(option.id);
    }
  };

  const hint = isMultiple
    ? `Escolha até ${max} ${max === 1 ? 'opção' : 'opções'}${step.required ? '' : ' (opcional)'}`
    : !step.required
      ? 'Opcional'
      : null;

  return (
    <form
      key={step.id}
      data-step-id={step.id}
      className="animate-fade-up mx-auto w-full max-w-2xl"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      onKeyDown={handleKeyDown}
      noValidate
    >
      {step.kind === 'price' && step.module ? <PriceOfferCard step={step} /> : null}

      <fieldset disabled={busy} aria-describedby={error ? `${step.id}-error` : undefined}>
        <legend className="w-full">
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl leading-snug font-semibold text-white outline-none sm:text-3xl">
            {step.text}
            {step.required ? <span className="sr-only"> (obrigatória)</span> : null}
          </h1>
        </legend>
        {step.helpText ? <p className="mt-3 text-base text-night-200">{step.helpText}</p> : null}
        {hint ? <p className="mt-2 text-sm text-night-300">{hint}</p> : null}

        {isScale ? (
          <div className="mt-8">
            <div className="grid grid-cols-6 gap-2 sm:gap-3">
              {step.options.map((option) => {
                const checked = selected.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className={`flex h-14 cursor-pointer items-center justify-center rounded-2xl border text-lg font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand-400 ${
                      checked ? 'border-brand-400 bg-brand-500 text-white' : 'border-night-600 bg-night-800 text-night-100 hover:border-night-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={step.id}
                      value={option.id}
                      checked={checked}
                      onChange={() => toggle(option.id)}
                      onClick={(event) => handleClick(event, option.id)}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
            {step.scaleMinLabel || step.scaleMaxLabel ? (
              <div className="mt-2 flex justify-between text-sm text-night-200">
                <span>0 = {step.scaleMinLabel}</span>
                <span>5 = {step.scaleMaxLabel}</span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {step.options.map((option, index) => {
              const checked = selected.includes(option.id);
              const disabled = isMultiple && !checked && selected.length >= max;
              return (
                <label
                  key={option.id}
                  className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left text-base transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand-400 sm:text-lg ${
                    checked
                      ? 'border-brand-400 bg-brand-500/20 text-white'
                      : disabled
                        ? 'cursor-not-allowed border-night-700 bg-night-800/60 text-night-300'
                        : 'border-night-600 bg-night-800 text-night-100 hover:border-night-300'
                  }`}
                >
                  <input
                    type={isMultiple ? 'checkbox' : 'radio'}
                    name={step.id}
                    value={option.id}
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(option.id)}
                    onClick={(event) => handleClick(event, option.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs font-bold ${
                      checked ? 'border-brand-300 bg-brand-500 text-white' : 'border-night-500 text-night-200'
                    }`}
                  >
                    {checked ? <Icon name="check" className="h-4 w-4" /> : LETTERS[index]}
                  </span>
                  <span className="flex-1">{option.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </fieldset>

      {error ? (
        <p id={`${step.id}-error`} role="alert" className="mt-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex items-center gap-4">
        <button
          type="submit"
          disabled={busy || (step.required && selected.length === 0)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-mint-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-mint-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" /> : null}
          OK <Icon name="check" className="h-4 w-4" />
        </button>
        <span className="hidden text-sm text-night-300 sm:inline">
          pressione <kbd className="rounded bg-night-700 px-1.5 py-0.5 font-sans">Enter ↵</kbd>
        </span>
      </div>
    </form>
  );
}

function PriceOfferCard({ step }: { step: StepDTO }) {
  const bookModule = step.module!;
  return (
    <section aria-label="Seção do livro relacionada a esta etapa" className="mb-8 rounded-2xl bg-night-800 p-5 ring-1 ring-white/10 sm:p-6">
      <p className="text-xs font-semibold tracking-wide text-brand-300 uppercase">Seção do livro desta etapa</p>
      <div className="mt-3 flex gap-4">
        <span className="text-4xl" aria-hidden="true">{bookModule.coverEmoji}</span>
        <div className="min-w-0">
          <p className="text-sm text-night-300">{bookModule.subtitle}</p>
          <h2 className="text-xl font-bold text-white">{bookModule.title}</h2>
          <p className="mt-1 text-sm text-night-200">{bookModule.description}</p>
        </div>
      </div>
      {bookModule.highlights.length ? (
        <ul className="mt-4 space-y-1.5 text-sm text-night-100">
          {bookModule.highlights.map((highlight) => (
            <li key={highlight} className="flex gap-2">
              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" /> {highlight}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-white/10 pt-4">
        <p>
          <span className="block text-xs text-night-300">Valor desta seção</span>
          <span className="font-display text-3xl font-extrabold text-white">{formatBRL(bookModule.priceCents)}</span>
        </p>
        <Link
          href={`/modulos/${bookModule.slug}`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-300 hover:text-brand-200"
        >
          Ler a prévia <Icon name="external" className="h-4 w-4" />
          <span className="sr-only">(abre em nova aba)</span>
        </Link>
      </div>
    </section>
  );
}
