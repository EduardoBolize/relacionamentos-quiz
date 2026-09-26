'use client';

import {
  CardValidationError,
  TEST_CARDS,
  formatCardNumber,
  formatCpf,
  tokenizeCardMock,
  type CardFormErrors,
} from '@relacionamentos/payments/client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert, Badge } from '@/components/ui/Feedback';
import { CheckboxField, SelectField, TextField } from '@/components/ui/Field';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ApiError, apiFetch, fieldError } from '@/lib/api-client';
import { trackClientEvent } from '@/lib/consent';
import type { CatalogModuleDTO, QuoteDTO } from '@/lib/dto';
import { formatBRL } from '@/lib/format';

type Method = 'pix' | 'boleto' | 'card';

const METHODS: { id: Method; label: string; icon: IconName; hint: string }[] = [
  { id: 'pix', label: 'Pix', icon: 'pix', hint: 'Aprovação em segundos' },
  { id: 'boleto', label: 'Boleto', icon: 'barcode', hint: 'Compensação em até 3 dias úteis' },
  { id: 'card', label: 'Cartão', icon: 'card', hint: 'Em até 3x sem juros' },
];

interface CheckoutFormProps {
  catalog: CatalogModuleDTO[];
  initialSlugs: string[];
  recommendedSlugs: string[];
}

export function CheckoutForm({ catalog, initialSlugs, recommendedSlugs }: CheckoutFormProps) {
  const router = useRouter();
  const [slugs, setSlugs] = useState<string[]>(initialSlugs);
  const [fetchedQuote, setFetchedQuote] = useState<{ key: string; quote: QuoteDTO } | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>('pix');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [card, setCard] = useState({ number: '', holderName: '', expiry: '', cvv: '' });
  const [installments, setInstallments] = useState(1);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [cardErrors, setCardErrors] = useState<CardFormErrors>({});
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackClientEvent('checkout_viewed', { moduleCount: initialSlugs.length });
  }, [initialSlugs.length]);

  // Orçamento sempre calculado pelo servidor. O valor exibido só vale para a seleção atual.
  const selectionKey = slugs.join(',');
  const quote = fetchedQuote && fetchedQuote.key === selectionKey ? fetchedQuote.quote : null;

  useEffect(() => {
    if (slugs.length === 0) return;
    const key = slugs.join(',');
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const next = await apiFetch<QuoteDTO>('/api/checkout/quote', { body: { moduleSlugs: slugs }, signal: controller.signal });
        setFetchedQuote({ key, quote: next });
        setQuoteError(null);
        setInstallments((current) => (next.installmentOptions.some((o) => o.count === current) ? current : 1));
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setQuoteError(err instanceof ApiError ? err.message : 'Não foi possível calcular o valor.');
      }
    }, 150);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [slugs]);

  const selectedModules = useMemo(() => catalog.filter((module) => slugs.includes(module.slug)), [catalog, slugs]);

  const toggleModule = (slug: string) =>
    setSlugs((current) => (current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]));

  const chooseMethod = (next: Method) => {
    setMethod(next);
    setSubmitError(null);
    trackClientEvent('payment_method_selected', { method: next });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setCardErrors({});
    if (!acceptTerms) {
      setSubmitError(new ApiError(400, 'terms', 'É preciso aceitar os termos para continuar.'));
      return;
    }

    let cardToken: string | undefined;
    if (method === 'card') {
      try {
        // Tokenização no navegador: número e CVV nunca são enviados ao nosso servidor.
        cardToken = tokenizeCardMock(card).token;
      } catch (err) {
        if (err instanceof CardValidationError) {
          setCardErrors(err.errors);
          return;
        }
        throw err;
      }
    }

    setSubmitting(true);
    try {
      const { orderPath } = await apiFetch<{ orderPath: string }>('/api/checkout/orders', {
        body: {
          moduleSlugs: slugs,
          customer: { name, email, ...(method === 'boleto' ? { document: cpf } : {}) },
          method,
          ...(method === 'card' ? { cardToken, installments } : {}),
          acceptTerms: true,
        },
      });
      router.push(orderPath);
    } catch (err) {
      setSubmitting(false);
      setSubmitError(err);
    }
  };

  const submitLabel =
    method === 'pix' ? 'Gerar Pix' : method === 'boleto' ? 'Gerar boleto' : quote ? `Pagar ${formatBRL(quote.totalCents)}` : 'Pagar';
  const generalError =
    submitError instanceof ApiError && !submitError.details ? submitError.message : submitError && !(submitError instanceof ApiError) ? 'Não foi possível concluir. Tente novamente.' : null;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        <Alert tone="warning" title="Ambiente de demonstração">
          Os pagamentos são <strong>simulados</strong>: nenhum valor será cobrado. Não informe dados reais de cartão.
        </Alert>

        <fieldset className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <legend className="sr-only">Seções do livro</legend>
          <h2 className="text-lg font-bold text-night-900">1. Seções do livro</h2>
          <p className="mt-1 text-sm text-slate-600">A partir de 2 seções, o desconto é aplicado automaticamente.</p>
          <ul className="mt-4 space-y-3">
            {catalog.map((module) => {
              const checked = slugs.includes(module.slug);
              return (
                <li key={module.id}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand-400 ${
                      checked ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleModule(module.slug)}
                      className="mt-1 h-5 w-5 shrink-0 accent-brand-600"
                    />
                    <span className="text-2xl" aria-hidden="true">{module.coverEmoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{module.title}</span>
                        {recommendedSlugs.includes(module.slug) ? <Badge>Recomendado para você</Badge> : null}
                      </span>
                      <span className="block text-sm text-slate-500">{module.subtitle}</span>
                    </span>
                    <span className="font-semibold whitespace-nowrap text-slate-900">{formatBRL(module.priceCents)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {fieldError(submitError, 'moduleSlugs') ? <p className="mt-2 text-sm text-red-700">{fieldError(submitError, 'moduleSlugs')}</p> : null}
        </fieldset>

        <fieldset className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <legend className="sr-only">Seus dados</legend>
          <h2 className="text-lg font-bold text-night-900">2. Seus dados</h2>
          <TextField
            label="Nome completo"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={fieldError(submitError, 'customer.name')}
            required
          />
          <TextField
            label="E-mail"
            type="email"
            inputMode="email"
            autoComplete="email"
            hint="Enviaremos o link de acesso ao conteúdo para este e-mail."
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldError(submitError, 'customer.email')}
            required
          />
        </fieldset>

        <fieldset className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <legend className="sr-only">Forma de pagamento</legend>
          <h2 className="text-lg font-bold text-night-900">3. Forma de pagamento</h2>
          <div role="radiogroup" aria-label="Forma de pagamento" className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            {METHODS.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand-400 ${
                  method === option.id ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <input type="radio" name="method" value={option.id} checked={method === option.id} onChange={() => chooseMethod(option.id)} className="sr-only" />
                <Icon name={option.icon} className="h-6 w-6" />
                <span className="font-semibold">{option.label}</span>
                <span className="hidden text-xs text-slate-500 sm:block">{option.hint}</span>
              </label>
            ))}
          </div>

          <div className="mt-6">
            {method === 'pix' ? (
              <p className="text-sm text-slate-600">
                Ao confirmar, geramos o QR Code e o código “copia e cola”. O acesso é liberado assim que o pagamento é
                confirmado.
              </p>
            ) : null}

            {method === 'boleto' ? (
              <div className="space-y-3">
                <TextField
                  label="CPF"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="000.000.000-00"
                  hint="Obrigatório para emissão de boleto. Não armazenamos o CPF."
                  value={cpf}
                  onChange={(event) => setCpf(formatCpf(event.target.value))}
                  error={fieldError(submitError, 'customer.document')}
                />
                <p className="text-sm text-slate-600">O boleto vence em poucos dias e a confirmação pode levar até 3 dias úteis.</p>
              </div>
            ) : null}

            {method === 'card' ? (
              <div className="space-y-4">
                <TextField
                  label="Número do cartão"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="0000 0000 0000 0000"
                  value={card.number}
                  onChange={(event) => setCard({ ...card, number: formatCardNumber(event.target.value) })}
                  error={cardErrors.number}
                />
                <TextField
                  label="Nome impresso no cartão"
                  autoComplete="cc-name"
                  value={card.holderName}
                  onChange={(event) => setCard({ ...card, holderName: event.target.value })}
                  error={cardErrors.holderName}
                />
                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    label="Validade"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/AA"
                    maxLength={5}
                    value={card.expiry}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
                      setCard({ ...card, expiry: digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits });
                    }}
                    error={cardErrors.expiry}
                  />
                  <TextField
                    label="CVV"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    maxLength={4}
                    value={card.cvv}
                    onChange={(event) => setCard({ ...card, cvv: event.target.value.replace(/\D/g, '') })}
                    error={cardErrors.cvv}
                  />
                </div>
                {quote ? (
                  <SelectField label="Parcelamento" value={installments} onChange={(event) => setInstallments(Number(event.target.value))}>
                    {quote.installmentOptions.map((option) => (
                      <option key={option.count} value={option.count}>
                        {option.count}x de {formatBRL(option.amountCents)} sem juros
                      </option>
                    ))}
                  </SelectField>
                ) : null}
                <details className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
                  <summary className="cursor-pointer font-semibold">Cartões de teste da simulação</summary>
                  <ul className="mt-3 space-y-1">
                    {TEST_CARDS.map((testCard) => (
                      <li key={testCard.number}>
                        <code className="font-mono">{testCard.number}</code> — {testCard.description}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-slate-500">Use qualquer validade futura e qualquer CVV de 3 dígitos.</p>
                </details>
              </div>
            ) : null}
          </div>
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <h2 className="text-lg font-bold text-night-900">Resumo</h2>
          {selectedModules.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Escolha ao menos uma seção do livro.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {selectedModules.map((module) => (
                <li key={module.id} className="flex justify-between gap-3">
                  <span className="text-slate-700">{module.title}</span>
                  <span className="whitespace-nowrap text-slate-900">{formatBRL(module.priceCents)}</span>
                </li>
              ))}
            </ul>
          )}
          {quote ? (
            <dl className="mt-4 space-y-1 border-t border-slate-200 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">Subtotal</dt>
                <dd>{formatBRL(quote.subtotalCents)}</dd>
              </div>
              {quote.discountCents > 0 ? (
                <div className="flex justify-between text-mint-600">
                  <dt>Desconto de {quote.discountPercent}%</dt>
                  <dd>−{formatBRL(quote.discountCents)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between pt-2 text-base font-bold text-night-900">
                <dt>Total</dt>
                <dd>{formatBRL(quote.totalCents)}</dd>
              </div>
            </dl>
          ) : null}
          {quoteError ? <p className="mt-3 text-sm text-red-700" role="alert">{quoteError}</p> : null}

          <CheckboxField
            className="mt-5"
            label="Li e aceito os termos de compra e a política de privacidade."
            checked={acceptTerms}
            onChange={(event) => setAcceptTerms(event.target.checked)}
          />

          {generalError ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {generalError}
            </p>
          ) : null}
          {submitError instanceof ApiError && submitError.details ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {submitError.message} {fieldError(submitError, 'acceptTerms') ?? fieldError(submitError, 'cardToken') ?? ''}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="mt-5 w-full" loading={submitting} disabled={!quote || slugs.length === 0}>
            <Icon name="lock" className="h-4 w-4" /> {submitLabel}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <Icon name="shield" className="h-4 w-4" /> Dados protegidos · pagamento simulado
          </p>
        </div>
      </aside>
    </form>
  );
}
