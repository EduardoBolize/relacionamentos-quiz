import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/admin/AdminUi';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { QuestionEditor } from '@/components/admin/QuestionEditor';
import { Alert } from '@/components/ui/Feedback';
import { requireAdminPage } from '@/server/auth/admin-auth';
import { db } from '@/server/db';
import { getReferenceData, safeCondition } from '@/server/services/admin-queries';

export const metadata = { title: 'Editar pergunta' };

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const [question, stages, categories, references] = await Promise.all([
    db().question.findUnique({
      where: { id },
      include: { options: { orderBy: { position: 'asc' }, include: { weights: true } } },
    }),
    db().stage.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] }),
    db().category.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }] }),
    getReferenceData(),
  ]);
  if (!question) notFound();
  const { condition, invalid } = safeCondition(question.conditionJson);

  return (
    <>
      <PageHeader
        title="Editar pergunta"
        description={
          <>
            Alterações valem para os próximos testes. Resultados já concluídos ficam “congelados”.{' '}
            <Link href="/admin/perguntas" className="text-brand-700 underline">Voltar à lista</Link>
          </>
        }
        actions={
          <DeleteButton
            endpoint={`/api/admin/questions/${question.id}`}
            confirmText="Excluir esta pergunta? Regras e condições que dependem dela deixarão de funcionar. Prefira desativar se tiver dúvida."
            redirectTo="/admin/perguntas"
          />
        }
      />
      {invalid ? <Alert tone="error" className="mb-4">A condição salva estava inválida e foi descartada. Salve para corrigir.</Alert> : null}
      <QuestionEditor
        stages={stages.map((s) => ({ id: s.id, title: s.title }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
        references={references}
        initial={{
          id: question.id,
          stageId: question.stageId,
          text: question.text,
          helpText: question.helpText ?? '',
          type: question.type as 'single' | 'multiple' | 'scale',
          required: question.required,
          maxSelections: question.maxSelections,
          scaleMinLabel: question.scaleMinLabel ?? '',
          scaleMaxLabel: question.scaleMaxLabel ?? '',
          position: question.position,
          active: question.active,
          condition,
          options: question.options.map((option) => ({
            id: option.id,
            key: option.id,
            label: option.label,
            weights: Object.fromEntries(option.weights.map((weight) => [weight.categoryId, weight.weight])),
          })),
        }}
      />
    </>
  );
}
