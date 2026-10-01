import Link from 'next/link';
import { Card, PageHeader, StatusPill } from '@/components/admin/AdminUi';
import { buttonClasses } from '@/components/ui/Button';
import { formatBRL } from '@/lib/format';
import { requireAdminPage } from '@/server/auth/admin-auth';
import { db } from '@/server/db';

export const metadata = { title: 'Módulos e aulas' };

export default async function ModulesPage() {
  await requireAdminPage();
  const modules = await db().bookModule.findMany({
    orderBy: [{ position: 'asc' }, { title: 'asc' }],
    include: {
      categories: { include: { category: true } },
      videos: { select: { videoUrl: true, active: true } },
      _count: { select: { orderItems: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Módulos e aulas"
        description="Cada módulo do curso tem prévia gratuita, aulas em vídeo (~1 minuto), texto completo (liberado após o pagamento), preço, temas relacionados e, se quiser, um link de checkout externo (ex.: Kiwify)."
        actions={
          <Link href="/admin/modulos/novo" className={buttonClasses('primary', 'sm')}>
            + Novo módulo
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((module) => (
          <Card key={module.id}>
            <div className="flex items-start gap-3">
              <span className="text-3xl" aria-hidden="true">{module.coverEmoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500">{module.subtitle}</p>
                <h2 className="font-semibold text-slate-900">{module.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{module.categories.map((link) => link.category.name).join(', ') || 'Sem categoria'}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <strong>{formatBRL(module.priceCents)}</strong>
                  <StatusPill active={module.active} />
                  <span className="text-xs text-slate-500">{module._count.orderItems} venda(s)</span>
                  <span className="text-xs text-slate-500">
                    {module.videos.filter((video) => video.active).length} aula(s) ·{' '}
                    {module.videos.filter((video) => video.active && video.videoUrl).length} com vídeo publicado
                  </span>
                  {module.checkoutUrl ? <span className="text-xs font-medium text-brand-700">Checkout externo</span> : null}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link href={`/admin/modulos/${module.id}`} className={buttonClasses('secondary', 'sm')}>
                Editar
              </Link>
              <Link href={`/modulos/${module.slug}`} target="_blank" rel="noopener" className={buttonClasses('ghost', 'sm')}>
                Ver página
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
