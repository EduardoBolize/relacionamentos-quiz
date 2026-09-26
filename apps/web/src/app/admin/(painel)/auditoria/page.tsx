import { Card, PageHeader } from '@/components/admin/AdminUi';
import { formatDateTime } from '@/lib/format';
import { requireAdminPage } from '@/server/auth/admin-auth';
import { db } from '@/server/db';

export const metadata = { title: 'Auditoria' };

const ACTION_LABELS: Record<string, string> = {
  create: 'Criou',
  update: 'Alterou',
  delete: 'Excluiu',
  login: 'Login',
  logout: 'Logout',
  login_failed: 'Falha de login',
  login_blocked: 'Login bloqueado',
  password_change: 'Trocou a senha',
  password_reset: 'Senha redefinida',
};

export default async function AuditPage() {
  await requireAdminPage();
  const logs = await db().auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { admin: true } });

  return (
    <>
      <PageHeader title="Auditoria" description="Registro das ações no painel e das tentativas de acesso (últimos 200 eventos)." />
      <Card className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th scope="col" className="py-2 pr-3">Quando</th>
              <th scope="col" className="py-2 pr-3">Quem</th>
              <th scope="col" className="py-2 pr-3">Ação</th>
              <th scope="col" className="py-2">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                <td className="py-2 pr-3">{log.admin?.email ?? '—'}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {ACTION_LABELS[log.action] ?? log.action} <span className="text-xs text-slate-500">{log.entity}</span>
                </td>
                <td className="py-2 text-slate-700">{log.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
