import Link from 'next/link';
import { Card, PageHeader } from '@/components/admin/AdminUi';
import { Alert } from '@/components/ui/Feedback';
import { METHOD_LABELS, ORDER_STATUS_LABELS, formatBRL, formatDateTime } from '@/lib/format';
import { requireAdminPage } from '@/server/auth/admin-auth';
import { getDashboardData } from '@/server/services/dashboard-service';

export const metadata = { title: 'Painel' };

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-night-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
}

const pct = (value: number | null) => (value === null ? '—' : `${value.toLocaleString('pt-BR')}%`);

export default async function AdminDashboardPage() {
  await requireAdminPage();
  const data = await getDashboardData();
  const maxPrimary = Math.max(1, ...data.primaryDistribution.map((row) => row.count));
  const errors = data.issues.filter((issue) => issue.level === 'error');
  const warnings = data.issues.filter((issue) => issue.level === 'warning');

  return (
    <>
      <PageHeader title="Painel" description="Visão geral do quiz, das vendas e da saúde da configuração." />

      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Testes iniciados" value={data.kpis.sessionsStarted.toLocaleString('pt-BR')} />
        <Kpi label="Testes concluídos" value={data.kpis.sessionsCompleted.toLocaleString('pt-BR')} hint={`Taxa de conclusão: ${pct(data.kpis.completionRate)}`} />
        <Kpi
          label="Pedidos pagos"
          value={`${data.kpis.paidOrders} de ${data.kpis.orders}`}
          hint={`Quem concluiu o quiz e comprou: ${pct(data.kpis.conversionRate)}`}
        />
        <Kpi
          label="Receita (simulada)"
          value={formatBRL(data.kpis.revenueCents)}
          hint={data.kpis.averageTicketCents !== null ? `Ticket médio: ${formatBRL(data.kpis.averageTicketCents)}` : undefined}
        />
      </section>

      <section aria-labelledby="saude" className="mt-6">
        <Card>
          <h2 id="saude" className="text-lg font-bold text-night-900">Verificação da configuração</h2>
          {data.issues.length === 0 ? (
            <p className="mt-2 text-sm text-green-800">Tudo certo: nenhuma inconsistência encontrada nas perguntas, regras e módulos.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {errors.length ? (
                <Alert tone="error" title={`${errors.length} erro(s) — corrija para o quiz funcionar como esperado`}>
                  <ul className="mt-1 list-disc pl-4">
                    {errors.map((issue) => (
                      <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>
                    ))}
                  </ul>
                </Alert>
              ) : null}
              {warnings.length ? (
                <Alert tone="warning" title={`${warnings.length} aviso(s)`}>
                  <ul className="mt-1 list-disc pl-4">
                    {warnings.map((issue) => (
                      <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>
                    ))}
                  </ul>
                </Alert>
              ) : null}
            </div>
          )}
        </Card>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold text-night-900">Temas principais nos resultados</h2>
          {data.primaryDistribution.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Ainda não há testes concluídos.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.primaryDistribution.map((row) => (
                <li key={row.categoryId ?? 'nenhum'}>
                  <div className="flex justify-between text-sm">
                    <span>{row.name}</span>
                    <span className="tabular-nums text-slate-600">{row.count}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100" aria-hidden="true">
                    <div className="h-2 rounded-full" style={{ width: `${(row.count / maxPrimary) * 100}%`, backgroundColor: row.color }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-night-900">Concordância com o valor</h2>
            <Link href="/admin/precos" className="text-sm font-medium text-brand-700 hover:underline">
              Ajustar preços →
            </Link>
          </div>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th scope="col" className="py-1 font-medium">Módulo</th>
                <th scope="col" className="py-1 text-right font-medium">Preço</th>
                <th scope="col" className="py-1 text-right font-medium">Concordam</th>
                <th scope="col" className="py-1 text-right font-medium">Vendas</th>
              </tr>
            </thead>
            <tbody>
              {data.priceAcceptance.map((row) => (
                <tr key={row.moduleId} className="border-t border-slate-100">
                  <td className="py-2">{row.title}</td>
                  <td className="py-2 text-right tabular-nums">{formatBRL(row.priceCents)}</td>
                  <td className="py-2 text-right tabular-nums">
                    {row.agreeRate === null ? '—' : `${row.agreeRate}%`} <span className="text-xs text-slate-500">({row.total})</span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{row.paidOrders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-night-900">Funil (eventos com consentimento)</h2>
          <p className="text-xs text-slate-500">
            Cada pessoa conta uma vez por etapa. Só inclui visitantes que aceitaram métricas ({data.consentedEvents.toLocaleString('pt-BR')} eventos registrados).
          </p>
          <ol className="mt-4 space-y-2">
            {data.funnel.map((step) => (
              <li key={step.event} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span>{step.label}</span>
                <span className="tabular-nums">
                  <strong>{step.count.toLocaleString('pt-BR')}</strong>
                  {step.rateFromPrevious !== null ? <span className="ml-2 text-xs text-slate-500">{pct(step.rateFromPrevious)} do passo anterior</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-night-900">Pedidos recentes</h2>
          {data.recentOrders.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Nenhum pedido ainda.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-100">
                    <td className="py-2">{formatDateTime(order.createdAt)}</td>
                    <td className="py-2">{METHOD_LABELS[order.method] ?? order.method}</td>
                    <td className="py-2">{ORDER_STATUS_LABELS[order.status] ?? order.status}</td>
                    <td className="py-2 text-right tabular-nums">{formatBRL(order.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 text-xs text-slate-500">
            {data.methods.map((method) => (
              <span key={method.method}>
                {METHOD_LABELS[method.method] ?? method.method}: {method.paid}/{method.total} pagos
              </span>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
