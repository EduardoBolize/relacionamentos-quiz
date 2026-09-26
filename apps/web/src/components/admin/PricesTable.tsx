'use client';

import { formatBRL, parseBRLToCents } from '@relacionamentos/payments/client';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api-client';
import { FormFeedback } from './AdminUi';
import { useAdminAction } from './useAdminAction';

export interface PriceRow {
  moduleId: string;
  title: string;
  priceCents: number;
  agree: number;
  maybe: number;
  disagree: number;
  total: number;
  agreeRate: number | null;
  paidOrders: number;
}

/**
 * Preços editáveis lado a lado com a concordância registrada nas perguntas de fim de etapa —
 * ajuda a calibrar o valor de cada seção do livro.
 */
export function PricesTable({ rows }: { rows: PriceRow[] }) {
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((row) => [row.moduleId, formatBRL(row.priceCents).replace('R$ ', '')])),
  );
  const [invalid, setInvalid] = useState<string[]>([]);
  const { run, busy, error, message } = useAdminAction();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = rows.map((row) => ({ moduleId: row.moduleId, priceCents: parseBRLToCents(prices[row.moduleId] ?? '') }));
    const bad = parsed.filter((entry) => entry.priceCents === null).map((entry) => entry.moduleId);
    setInvalid(bad);
    if (bad.length) return;
    void run(() => apiFetch('/api/admin/prices', { method: 'PUT', body: { prices: parsed } }), { success: 'Preços atualizados.' });
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th scope="col" className="py-2 pr-3">Módulo</th>
              <th scope="col" className="py-2 pr-3">Preço (R$)</th>
              <th scope="col" className="py-2 pr-3">Concordância com o valor</th>
              <th scope="col" className="py-2 pr-3 text-right">Respostas</th>
              <th scope="col" className="py-2 text-right">Vendas pagas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const pct = (n: number) => (row.total ? (n / row.total) * 100 : 0);
              return (
                <tr key={row.moduleId} className="border-b border-slate-100 align-middle">
                  <td className="py-3 pr-3 font-medium text-slate-900">{row.title}</td>
                  <td className="py-3 pr-3">
                    <input
                      aria-label={`Preço de ${row.title}`}
                      inputMode="decimal"
                      aria-invalid={invalid.includes(row.moduleId)}
                      className="w-28 rounded-md border border-slate-300 px-2 py-1.5 aria-[invalid=true]:border-red-500"
                      value={prices[row.moduleId] ?? ''}
                      onChange={(e) => setPrices({ ...prices, [row.moduleId]: e.target.value })}
                    />
                  </td>
                  <td className="py-3 pr-3">
                    {row.total ? (
                      <div className="w-56">
                        <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                          <span className="bg-green-500" style={{ width: `${pct(row.agree)}%` }} />
                          <span className="bg-amber-400" style={{ width: `${pct(row.maybe)}%` }} />
                          <span className="bg-red-400" style={{ width: `${pct(row.disagree)}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          {row.agreeRate}% concordam · {Math.round(pct(row.maybe))}% querem ver a prévia · {Math.round(pct(row.disagree))}% não concordam
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Sem respostas ainda</span>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">{row.total}</td>
                  <td className="py-3 text-right tabular-nums">{row.paidOrders}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 space-y-3">
        {invalid.length ? <p className="text-sm text-red-700">Corrija os preços destacados (ex.: 29,90).</p> : null}
        <FormFeedback error={error} message={message} />
        <Button type="submit" loading={busy}>
          Salvar preços
        </Button>
      </div>
    </form>
  );
}
