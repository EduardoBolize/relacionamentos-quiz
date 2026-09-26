import Link from 'next/link';
import { PageHeader } from '@/components/admin/AdminUi';
import { QuestionEditor } from '@/components/admin/QuestionEditor';
import { Alert } from '@/components/ui/Feedback';
import { requireAdminPage } from '@/server/auth/admin-auth';
import { db } from '@/server/db';
import { getReferenceData } from '@/server/services/admin-queries';

export const metadata = { title: 'Nova pergunta' };

export default async function NewQuestionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage();
  const { etapa } = await searchParams;
  const [stages, categories, references] = await Promise.all([
    db().stage.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }], include: { _count: { select: { questions: true } } } }),
    db().category.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }] }),
    getReferenceData(),
  ]);

  if (stages.length === 0) {
    return (
      <>
        <PageHeader title="Nova pergunta" />
        <Alert tone="warning">
          Crie uma etapa antes de cadastrar perguntas. <Link href="/admin/etapas" className="underline">Ir para Etapas</Link>
        </Alert>
      </>
    );
  }

  const stage = stages.find((s) => s.id === etapa) ?? stages[0]!;

  return (
    <>
      <PageHeader title="Nova pergunta" description="Cadastre o enunciado, as opções e os pesos de cada opção por categoria." />
      <QuestionEditor
        stages={stages.map((s) => ({ id: s.id, title: s.title }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
        references={references}
        initial={{
          stageId: stage.id,
          text: '',
          helpText: '',
          type: 'single',
          required: true,
          maxSelections: null,
          scaleMinLabel: '',
          scaleMaxLabel: '',
          position: stage._count.questions,
          active: true,
          condition: null,
          options: [
            { key: 'a', label: '', weights: {} },
            { key: 'b', label: '', weights: {} },
          ],
        }}
      />
    </>
  );
}
