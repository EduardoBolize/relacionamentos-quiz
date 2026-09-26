import { Card, PageHeader } from '@/components/admin/AdminUi';
import { Alert } from '@/components/ui/Feedback';
import { formatDateTime } from '@/lib/format';
import { requireAdminPage } from '@/server/auth/admin-auth';
import { db } from '@/server/db';
import { getEnv } from '@/server/env';

export const metadata = { title: 'E-mails (simulação)' };

/**
 * Caixa de saída do provedor de e-mail "outbox" (desenvolvimento). Permite testar recuperação de
 * resultado e confirmação de pagamento sem um serviço de e-mail real. Em produção o provedor é
 * outro e esta página fica vazia.
 */
export default async function EmailsPage() {
  await requireAdminPage();
  const enabled = getEnv().EMAIL_PROVIDER === 'outbox';
  const emails = enabled ? await db().emailOutbox.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }) : [];

  return (
    <>
      <PageHeader title="E-mails (simulação)" description="Mensagens que seriam enviadas às pessoas. Útil para testar os links de recuperação e de acesso." />
      {!enabled ? (
        <Alert tone="info">Disponível apenas com EMAIL_PROVIDER=&quot;outbox&quot; (ambiente de desenvolvimento).</Alert>
      ) : (
        <div className="space-y-4">
          <Alert tone="warning" title="Somente para desenvolvimento">
            Estas mensagens contêm links pessoais de acesso. Nunca use o provedor “outbox” em produção.
          </Alert>
          {emails.length === 0 ? <p className="text-sm text-slate-600">Nenhum e-mail enviado ainda.</p> : null}
          {emails.map((email) => (
            <Card key={email.id}>
              <p className="text-xs text-slate-500">
                {formatDateTime(email.createdAt)} · para {email.to}
              </p>
              <h2 className="mt-1 font-semibold text-slate-900">{email.subject}</h2>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-3 font-sans text-sm whitespace-pre-wrap text-slate-700">{email.body}</pre>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
