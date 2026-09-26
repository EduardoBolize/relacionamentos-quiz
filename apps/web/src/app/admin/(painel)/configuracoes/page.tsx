import { Card, PageHeader } from '@/components/admin/AdminUi';
import { EngineAndPaymentSettingsForm, PasswordForm } from '@/components/admin/SettingsForms';
import { requireAdminPage } from '@/server/auth/admin-auth';
import { getEnv } from '@/server/env';
import { getEngineSettings, getPaymentSettings } from '@/server/settings';

export const metadata = { title: 'Configurações' };

export default async function SettingsPage() {
  const admin = await requireAdminPage();
  const [engine, payment] = await Promise.all([getEngineSettings(), getPaymentSettings()]);
  const env = getEnv();

  return (
    <>
      <PageHeader title="Configurações" description="Limites do motor de recomendação, prazos de pagamento e sua conta." />
      <div className="space-y-6">
        <Card>
          <EngineAndPaymentSettingsForm engine={engine} payment={payment} />
        </Card>
        <Card>
          <h2 className="text-lg font-bold text-night-900">Ambiente</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Provedor de pagamento</dt>
              <dd className="font-medium">{env.PAYMENT_PROVIDER === 'mock' ? 'Simulado (mock)' : env.PAYMENT_PROVIDER}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Simulador de pagamento</dt>
              <dd className="font-medium">{env.PAYMENT_SIMULATOR_ENABLED ? 'Ligado' : 'Desligado'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Envio de e-mails</dt>
              <dd className="font-medium">{env.EMAIL_PROVIDER === 'outbox' ? 'Caixa de saída (simulação)' : 'Somente registro no console'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Variáveis</dt>
              <dd className="text-slate-600">Definidas no arquivo .env (não editáveis pelo painel).</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2 className="mb-1 text-lg font-bold text-night-900">Minha conta</h2>
          <p className="mb-4 text-sm text-slate-600">{admin.email}</p>
          <PasswordForm />
        </Card>
      </div>
    </>
  );
}
