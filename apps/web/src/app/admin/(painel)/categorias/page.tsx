import { Card, PageHeader, StatusPill } from '@/components/admin/AdminUi';
import { CategoryForm, EMPTY_CATEGORY } from '@/components/admin/CategoryForm';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { requireAdminPage } from '@/server/auth/admin-auth';
import { db } from '@/server/db';

export const metadata = { title: 'Categorias' };

export default async function CategoriesPage() {
  await requireAdminPage();
  const categories = await db().category.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { weights: true, modules: true } } },
  });

  return (
    <>
      <PageHeader
        title="Categorias (temas)"
        description="Os temas que o quiz pontua. Cada opção de resposta soma pontos em uma ou mais categorias; o resultado destaca as que mais pontuaram."
      />
      <div className="space-y-4">
        {categories.map((category) => (
          <Card key={category.id}>
            <details>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: category.color }} aria-hidden="true" />
                <span className="font-semibold text-slate-900">{category.name}</span>
                <code className="text-xs text-slate-500">{category.slug}</code>
                <StatusPill active={category.active} />
                <span className="ml-auto text-xs text-slate-500">
                  {category._count.weights} pesos · {category._count.modules} módulo(s) · ordem {category.position}
                </span>
              </summary>
              <div className="mt-5 border-t border-slate-100 pt-5">
                <CategoryForm
                  initial={{
                    id: category.id,
                    slug: category.slug,
                    name: category.name,
                    shortDescription: category.shortDescription,
                    explanation: category.explanation,
                    color: category.color,
                    position: category.position,
                    active: category.active,
                  }}
                />
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <DeleteButton
                    endpoint={`/api/admin/categories/${category.id}`}
                    confirmText={`Excluir a categoria "${category.name}"? Os pesos ligados a ela serão apagados. Prefira desativar se tiver dúvida.`}
                  />
                </div>
              </div>
            </details>
          </Card>
        ))}
        <Card className="border-2 border-dashed border-brand-200 shadow-none ring-0">
          <details>
            <summary className="cursor-pointer font-semibold text-brand-700">+ Nova categoria</summary>
            <div className="mt-5">
              <CategoryForm initial={{ ...EMPTY_CATEGORY, position: categories.length }} />
            </div>
          </details>
        </Card>
      </div>
    </>
  );
}
