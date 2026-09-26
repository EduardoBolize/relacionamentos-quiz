import Link from 'next/link';
import { describeCondition } from '@relacionamentos/quiz-engine';
import { Card, PageHeader, StatusPill } from '@/components/admin/AdminUi';
import { buttonClasses } from '@/components/ui/Button';
import { requireAdminPage } from '@/server/auth/admin-auth';
import { db } from '@/server/db';
import { getQuizDefinition } from '@/server/definition';
import { safeCondition } from '@/server/services/admin-queries';

export const metadata = { title: 'Perguntas' };

const TYPE_LABELS: Record<string, string> = { single: 'Escolha única', multiple: 'Múltipla escolha', scale: 'Escala 0–5' };

export default async function QuestionsPage() {
  await requireAdminPage();
  const [stages, { definition }] = await Promise.all([
    db().stage.findMany({
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: {
        questions: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          include: { _count: { select: { options: true } } },
        },
      },
    }),
    getQuizDefinition(),
  ]);

  return (
    <>
      <PageHeader
        title="Perguntas e pesos"
        description="Uma pergunta por tela, na ordem abaixo. Em cada pergunta você define as opções, quantos pontos cada uma soma em cada categoria e quando ela deve aparecer."
        actions={
          <Link href="/admin/perguntas/nova" className={buttonClasses('primary', 'sm')}>
            + Nova pergunta
          </Link>
        }
      />
      <div className="space-y-6">
        {stages.map((stage) => (
          <Card key={stage.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-night-900">
                {stage.title} {stage.active ? null : <StatusPill active={false} />}
              </h2>
              <Link href={`/admin/perguntas/nova?etapa=${stage.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                + Pergunta nesta etapa
              </Link>
            </div>
            {stage.questions.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Nenhuma pergunta nesta etapa.</p>
            ) : (
              <ol className="mt-3 divide-y divide-slate-100">
                {stage.questions.map((question) => {
                  const { condition } = safeCondition(question.conditionJson);
                  return (
                    <li key={question.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <Link href={`/admin/perguntas/${question.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                          {question.text}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {TYPE_LABELS[question.type] ?? question.type} · {question._count.options} opções
                          {question.required ? '' : ' · opcional'}
                          {condition ? ` · aparece se: ${describeCondition(condition, definition)}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <StatusPill active={question.active} />
                        <Link href={`/admin/perguntas/${question.id}`} className={buttonClasses('secondary', 'sm')}>
                          Editar
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
