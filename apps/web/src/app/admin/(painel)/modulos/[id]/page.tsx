import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/admin/AdminUi';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { ModuleForm } from '@/components/admin/ModuleForm';
import { requireAdminPage } from '@/server/auth/admin-auth';
import { db } from '@/server/db';

export const metadata = { title: 'Editar módulo' };

export default async function EditModulePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const [module, categories] = await Promise.all([
    db().bookModule.findUnique({ where: { id }, include: { categories: true, _count: { select: { orderItems: true } } } }),
    db().category.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }] }),
  ]);
  if (!module) notFound();

  return (
    <>
      <PageHeader
        title={`Editar: ${module.title}`}
        description={
          <>
            Mudanças de preço valem para novos pedidos (pedidos existentes guardam o valor da compra).{' '}
            <Link href="/admin/modulos" className="text-brand-700 underline">Voltar à lista</Link>
          </>
        }
        actions={
          module._count.orderItems === 0 ? (
            <DeleteButton endpoint={`/api/admin/modules/${module.id}`} confirmText={`Excluir o módulo "${module.title}"?`} redirectTo="/admin/modulos" />
          ) : null
        }
      />
      <ModuleForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initial={{
          id: module.id,
          slug: module.slug,
          title: module.title,
          subtitle: module.subtitle,
          description: module.description,
          previewContent: module.previewContent,
          content: module.content,
          priceCents: module.priceCents,
          coverEmoji: module.coverEmoji,
          position: module.position,
          active: module.active,
          categoryIds: module.categories.map((link) => link.categoryId),
        }}
      />
    </>
  );
}
