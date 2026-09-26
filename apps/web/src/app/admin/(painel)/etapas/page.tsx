import { describeCondition } from '@relacionamentos/quiz-engine';
import { Card, PageHeader, StatusPill } from '@/components/admin/AdminUi';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { EMPTY_STAGE, StageForm } from '@/components/admin/StageForm';
import { Alert } from '@/components/ui/Feedback';
import { requireAdminPage } from '@/server/auth/admin-auth';
import { db } from '@/server/db';
import { getQuizDefinition } from '@/server/definition';
import { getReferenceData, safeCondition } from '@/server/services/admin-queries';

export const metadata = { title: 'Etapas' };

export default async function StagesPage() {
  await requireAdminPage();
  const [stages, references, { definition }] = await Promise.all([
    db().stage.findMany({
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: { offerModule: true, _count: { select: { questions: true } } },
    }),
    getReferenceData(),
    getQuizDefinition(),
  ]);

  return (
    <>
      <PageHeader
        title="Etapas do quiz"
        description="As perguntas são agrupadas em etapas. Ao final de cada etapa ligada a um módulo do livro, a pessoa responde se concorda com o valor daquela seção."
      />
      <div className="space-y-4">
        {stages.map((stage, index) => {
          const { condition, invalid } = safeCondition(stage.conditionJson);
          return (
            <Card key={stage.id}>
              <details>
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{index + 1}</span>
                  <span className="font-semibold text-slate-900">{stage.title}</span>
                  <StatusPill active={stage.active} />
                  <span className="ml-auto text-xs text-slate-500">
                    {stage._count.questions} pergunta(s) ·{' '}
                    {stage.offerModule
                      ? `valor de “${stage.offerModule.title}” ${stage.priceQuestionEnabled ? (stage.priceQuestionMinScore ? `se tema ≥ ${stage.priceQuestionMinScore}` : 'sempre') : '(desligado)'}`
                      : 'sem módulo'}
                    {condition ? ` · condição: ${describeCondition(condition, definition)}` : ''}
                  </span>
                </summary>
                <div className="mt-5 border-t border-slate-100 pt-5">
                  {invalid ? <Alert tone="error" className="mb-4">A condição salva está inválida e foi ignorada. Salve novamente para corrigir.</Alert> : null}
                  <StageForm
                    references={references}
                    initial={{
                      id: stage.id,
                      title: stage.title,
                      description: stage.description,
                      position: stage.position,
                      active: stage.active,
                      condition,
                      offerModuleId: stage.offerModuleId,
                      priceQuestionEnabled: stage.priceQuestionEnabled,
                      priceQuestionMinScore: stage.priceQuestionMinScore,
                    }}
                  />
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <DeleteButton
                      endpoint={`/api/admin/stages/${stage.id}`}
                      confirmText={`Excluir a etapa "${stage.title}" e TODAS as suas perguntas? Prefira desativar se tiver dúvida.`}
                    />
                  </div>
                </div>
              </details>
            </Card>
          );
        })}
        <Card className="border-2 border-dashed border-brand-200 shadow-none ring-0">
          <details>
            <summary className="cursor-pointer font-semibold text-brand-700">+ Nova etapa</summary>
            <div className="mt-5">
              <StageForm references={references} initial={{ ...EMPTY_STAGE, position: stages.length }} />
            </div>
          </details>
        </Card>
      </div>
    </>
  );
}
