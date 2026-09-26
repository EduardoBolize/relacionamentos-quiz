import { describeCondition, describeEffect } from '@relacionamentos/quiz-engine';
import { Card, PageHeader, StatusPill } from '@/components/admin/AdminUi';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { EMPTY_RULE, RuleForm } from '@/components/admin/RuleForm';
import { Alert } from '@/components/ui/Feedback';
import { requireAdminPage } from '@/server/auth/admin-auth';
import { db } from '@/server/db';
import { getQuizDefinition } from '@/server/definition';
import { getReferenceData, safeCondition, safeEffects } from '@/server/services/admin-queries';

export const metadata = { title: 'Regras' };

export default async function RulesPage() {
  await requireAdminPage();
  const [rules, references, { definition }] = await Promise.all([
    db().rule.findMany({ orderBy: [{ priority: 'desc' }, { name: 'asc' }] }),
    getReferenceData(),
    getQuizDefinition(),
  ]);

  return (
    <>
      <PageHeader
        title="Regras condicionais"
        description="Ajustes aplicados depois da pontuação: somar/multiplicar pontos, recomendar módulos ou adicionar sinalizadores (ex.: mostrar canais de apoio). As condições usam as respostas e a pontuação base."
      />
      <div className="space-y-4">
        {rules.map((rule) => {
          const { condition, invalid: badCondition } = safeCondition(rule.conditionJson);
          const { effects, invalid: badEffects } = safeEffects(rule.effectsJson);
          return (
            <Card key={rule.id}>
              <details>
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-slate-900">{rule.name}</span>
                    <StatusPill active={rule.active} />
                    <span className="text-xs text-slate-500">prioridade {rule.priority}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    <strong>Se</strong> {describeCondition(condition, definition)} <strong>então</strong>{' '}
                    {effects.map((effect) => describeEffect(effect, definition)).join('; ') || '—'}
                  </p>
                </summary>
                <div className="mt-5 border-t border-slate-100 pt-5">
                  {badCondition || badEffects ? (
                    <Alert tone="error" className="mb-4">Esta regra tem JSON inválido e está sendo ignorada. Revise e salve novamente.</Alert>
                  ) : null}
                  <RuleForm
                    references={references}
                    initial={{
                      id: rule.id,
                      name: rule.name,
                      description: rule.description,
                      priority: rule.priority,
                      active: rule.active,
                      condition,
                      effects,
                    }}
                  />
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <DeleteButton endpoint={`/api/admin/rules/${rule.id}`} confirmText={`Excluir a regra "${rule.name}"?`} />
                  </div>
                </div>
              </details>
            </Card>
          );
        })}
        <Card className="border-2 border-dashed border-brand-200 shadow-none ring-0">
          <details>
            <summary className="cursor-pointer font-semibold text-brand-700">+ Nova regra</summary>
            <div className="mt-5">
              <RuleForm references={references} initial={EMPTY_RULE} />
            </div>
          </details>
        </Card>
      </div>
    </>
  );
}
