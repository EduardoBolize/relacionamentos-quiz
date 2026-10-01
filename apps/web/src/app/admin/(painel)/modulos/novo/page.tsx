import { PageHeader } from '@/components/admin/AdminUi';
import { EMPTY_MODULE, ModuleForm } from '@/components/admin/ModuleForm';
import { requireAdminPage } from '@/server/auth/admin-auth';
import { db } from '@/server/db';

export const metadata = { title: 'Novo módulo' };

export default async function NewModulePage() {
  await requireAdminPage();
  const [categories, count] = await Promise.all([
    db().category.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }] }),
    db().bookModule.count(),
  ]);
  return (
    <>
      <PageHeader title="Novo módulo" description="Um novo módulo do curso, com prévia pública, aulas em vídeo e texto liberados após o pagamento." />
      <ModuleForm initial={{ ...EMPTY_MODULE, position: count }} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
