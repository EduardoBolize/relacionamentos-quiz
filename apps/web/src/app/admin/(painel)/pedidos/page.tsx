import { Card, PageHeader } from '@/components/admin/AdminUi';
import { METHOD_LABELS, ORDER_STATUS_LABELS, formatBRL, formatDateTime } from '@/lib/format';
import { requireAdminPage } from '@/server/auth/admin-auth';
import { db } from '@/server/db';
import { maskEmailForAdmin } from '@/server/services/admin-queries';

export const metadata = { title: 'Pedidos' };

export default async function OrdersPage() {
  await requireAdminPage();
  const orders = await db().order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { items: true },
  });

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Últimos 100 pedidos. Os e-mails aparecem mascarados (minimização de dados); dados de cartão nunca são armazenados."
      />
      <Card className="overflow-x-auto">
        {orders.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhum pedido ainda.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th scope="col" className="py-2 pr-3">Data</th>
                <th scope="col" className="py-2 pr-3">Comprador</th>
                <th scope="col" className="py-2 pr-3">Itens</th>
                <th scope="col" className="py-2 pr-3">Pagamento</th>
                <th scope="col" className="py-2 pr-3">Status</th>
                <th scope="col" className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(order.createdAt)}</td>
                  <td className="py-2 pr-3">{maskEmailForAdmin(order.customerEmail)}</td>
                  <td className="py-2 pr-3">{order.items.map((item) => item.title).join(', ')}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {METHOD_LABELS[order.method] ?? order.method}
                    {order.method === 'card' ? ` · ${order.installments}x` : ''}
                  </td>
                  <td className="py-2 pr-3">
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    {order.failureReason ? <span className="block text-xs text-slate-500">{order.failureReason}</span> : null}
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatBRL(order.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
