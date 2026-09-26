import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Countdown, CopyButton, OrderStatusPoller, SimulatorPanel } from '@/components/checkout/OrderClient';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { ButtonLink } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { METHOD_LABELS, ORDER_STATUS_LABELS, formatBRL, formatDate, formatDateTime } from '@/lib/format';
import { getOrderView } from '@/server/services/checkout-service';

export const metadata: Metadata = { title: 'Seu pedido', robots: { index: false, follow: false } };

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await getOrderView(token);
  if (!order) notFound();

  const retryHref = `/checkout?modulos=${order.items.map((item) => item.slug).join(',')}`;

  return (
    <>
      <SiteHeader />
      <OrderStatusPoller token={token} status={order.status} />
      <main id="conteudo" className="bg-slate-50">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {order.status === 'paid' ? (
              <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="flex items-center gap-2 text-sm font-semibold text-mint-600">
                  <Icon name="check" className="h-5 w-5" /> Pagamento confirmado
                </p>
                <h1 className="mt-2 text-2xl font-bold text-night-900">Tudo certo, {order.customerFirstName}! Boa leitura.</h1>
                <p className="mt-2 text-slate-600">
                  Seu acesso está liberado. Guarde esta página (ou o link enviado por e-mail) para voltar quando quiser.
                </p>
                <ul className="mt-6 space-y-3">
                  {order.items.map((item) => (
                    <li key={item.slug} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                      <span className="flex items-center gap-3">
                        <span className="text-2xl" aria-hidden="true">{item.coverEmoji}</span>
                        <span className="font-semibold text-slate-900">{item.title}</span>
                      </span>
                      <ButtonLink href={`/pedido/${token}/modulos/${item.slug}`} size="sm">
                        Ler agora
                      </ButtonLink>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {order.status === 'pending' && order.pix ? (
              <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h1 className="text-2xl font-bold text-night-900">Pague com Pix para liberar o acesso</h1>
                <p className="mt-2 flex items-center gap-2 text-slate-600">
                  <Icon name="clock" className="h-5 w-5" /> O código expira em <Countdown until={order.pix.expiresAt} />
                </p>
                <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL gerada pelo gateway */}
                  <img
                    src={order.pix.qrCodeDataUrl}
                    alt="QR Code do Pix (simulado)"
                    width={220}
                    height={220}
                    className="rounded-xl border border-slate-200"
                  />
                  <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
                    <li>Abra o app do seu banco e escolha pagar com Pix.</li>
                    <li>Escaneie o QR Code ou use o código “copia e cola”.</li>
                    <li>Confirme o pagamento. Esta página atualiza sozinha.</li>
                  </ol>
                </div>
                <label htmlFor="pix-code" className="mt-6 block text-sm font-medium text-slate-800">
                  Código Pix copia e cola
                </label>
                <textarea
                  id="pix-code"
                  readOnly
                  rows={3}
                  value={order.pix.copyPasteCode}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs break-all text-slate-700"
                />
                <div className="mt-3">
                  <CopyButton value={order.pix.copyPasteCode} label="Copiar código Pix" />
                </div>
                <Alert tone="warning" className="mt-6">
                  Código de <strong>simulação</strong>: ele não é um Pix válido e nenhum banco conseguirá pagá-lo.
                </Alert>
              </section>
            ) : null}

            {order.status === 'pending' && order.boleto ? (
              <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h1 className="text-2xl font-bold text-night-900">Seu boleto foi gerado</h1>
                <p className="mt-2 text-slate-600">
                  Vencimento em <strong>{formatDate(`${order.boleto.dueDate}T12:00:00-03:00`)}</strong>. Após o pagamento, a
                  confirmação pode levar até 3 dias úteis.
                </p>
                <label htmlFor="linha-digitavel" className="mt-6 block text-sm font-medium text-slate-800">
                  Linha digitável
                </label>
                <input
                  id="linha-digitavel"
                  readOnly
                  value={order.boleto.digitableLine}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-sm text-slate-700"
                />
                <div className="mt-3">
                  <CopyButton value={order.boleto.digitableLine.replace(/\D/g, '')} label="Copiar linha digitável" />
                </div>
                <Alert tone="warning" className="mt-6">
                  Boleto de <strong>simulação</strong> (banco fictício “000”): não pode ser pago.
                </Alert>
              </section>
            ) : null}

            {order.status === 'failed' ? (
              <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h1 className="text-2xl font-bold text-night-900">Pagamento não aprovado</h1>
                <p className="mt-2 text-slate-600">{order.failureReason ?? 'O pagamento foi recusado.'}</p>
                <ButtonLink href={retryHref} className="mt-6">
                  Tentar novamente
                </ButtonLink>
              </section>
            ) : null}

            {order.status === 'expired' || order.status === 'canceled' ? (
              <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h1 className="text-2xl font-bold text-night-900">
                  {order.status === 'expired' ? 'O prazo de pagamento terminou' : 'Pedido cancelado'}
                </h1>
                <p className="mt-2 text-slate-600">Sem problemas: você pode gerar um novo pedido com as mesmas seções.</p>
                <ButtonLink href={retryHref} className="mt-6">
                  Gerar novo pedido
                </ButtonLink>
              </section>
            ) : null}

            {order.status === 'refunded' ? (
              <Alert tone="info" title="Pedido reembolsado">
                O valor deste pedido foi devolvido e o acesso ao conteúdo foi encerrado.
              </Alert>
            ) : null}

            {order.simulatorEnabled ? <SimulatorPanel token={token} /> : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-bold text-night-900">Resumo do pedido</h2>
              <p className="mt-1 text-sm text-slate-500">Feito em {formatDateTime(order.createdAt)}</p>
              <p className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">
                {ORDER_STATUS_LABELS[order.status]}
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {order.items.map((item) => (
                  <li key={item.slug} className="flex justify-between gap-3">
                    <span className="text-slate-700">{item.title}</span>
                    <span>{formatBRL(item.priceCents)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1 border-t border-slate-200 pt-4 text-sm">
                {order.discountCents > 0 ? (
                  <div className="flex justify-between text-mint-600">
                    <dt>Desconto</dt>
                    <dd>−{formatBRL(order.discountCents)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between text-base font-bold text-night-900">
                  <dt>Total</dt>
                  <dd>{formatBRL(order.totalCents)}</dd>
                </div>
                <div className="flex justify-between text-slate-600">
                  <dt>Forma de pagamento</dt>
                  <dd>
                    {METHOD_LABELS[order.method]}
                    {order.card ? ` · ${order.card.brand} final ${order.card.last4} · ${order.card.installments}x` : ''}
                  </dd>
                </div>
              </dl>
            </div>
            <p className="mt-4 text-center text-xs text-slate-500">
              Dúvidas? <Link href="/privacidade" className="underline">Privacidade e dados</Link>
            </p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
