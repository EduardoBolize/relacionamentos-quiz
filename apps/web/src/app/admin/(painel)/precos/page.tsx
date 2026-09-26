import { Card, PageHeader } from '@/components/admin/AdminUi';
import { PricesTable } from '@/components/admin/PricesTable';
import { PricingSettingsForm } from '@/components/admin/SettingsForms';
import { requireAdminPage } from '@/server/auth/admin-auth';
import { getPriceAcceptance } from '@/server/services/dashboard-service';
import { getPricingSettings } from '@/server/settings';

export const metadata = { title: 'Preços' };

export default async function PricesPage() {
  await requireAdminPage();
  const [rows, pricing] = await Promise.all([getPriceAcceptance(), getPricingSettings()]);
  return (
    <>
      <PageHeader
        title="Preços"
        description="Valor de cada seção do livro, ao lado de quantas pessoas concordaram com ele nas perguntas de fim de etapa. O checkout sempre recalcula o total no servidor com estes valores."
      />
      <div className="space-y-6">
        <Card>
          <PricesTable rows={rows} />
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-bold text-night-900">Descontos e parcelamento</h2>
          <PricingSettingsForm pricing={pricing} />
        </Card>
      </div>
    </>
  );
}
