'use client';

import type { Condition } from '@relacionamentos/quiz-engine';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { apiFetch } from '@/lib/api-client';
import type { ReferenceData } from '@/server/services/admin-queries';
import { FormFeedback } from './AdminUi';
import { ConditionBuilder } from './ConditionBuilder';
import { useAdminAction } from './useAdminAction';

export interface StageFormValue {
  id?: string;
  title: string;
  description: string;
  position: number;
  active: boolean;
  condition: Condition | null;
  offerModuleId: string | null;
  priceQuestionEnabled: boolean;
  priceQuestionMinScore: number;
}

export const EMPTY_STAGE: StageFormValue = {
  title: '',
  description: '',
  position: 0,
  active: true,
  condition: null,
  offerModuleId: null,
  priceQuestionEnabled: true,
  priceQuestionMinScore: 0,
};

export function StageForm({ initial, references }: { initial: StageFormValue; references: ReferenceData }) {
  const [value, setValue] = useState(initial);
  const { run, busy, error, message } = useAdminAction();
  const set = <K extends keyof StageFormValue>(key: K, next: StageFormValue[K]) => setValue((current) => ({ ...current, [key]: next }));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const { id, ...body } = value;
    void run(() => apiFetch(id ? `/api/admin/stages/${id}` : '/api/admin/stages', { method: id ? 'PUT' : 'POST', body }), {
      success: id ? 'Etapa atualizada.' : 'Etapa criada.',
    }).then((created) => {
      if (!id && created) setValue(EMPTY_STAGE);
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <TextField label="Título da etapa" value={value.title} onChange={(e) => set('title', e.target.value)} required />
      <TextField label="Ordem" type="number" min={0} value={value.position} onChange={(e) => set('position', Number(e.target.value))} />
      <TextAreaField className="md:col-span-2" label="Descrição" rows={2} value={value.description} onChange={(e) => set('description', e.target.value)} />

      <fieldset className="md:col-span-2 rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-800">Módulo do curso e pergunta de valor</legend>
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            label="Módulo relacionado"
            hint="Ao final da etapa, perguntamos se a pessoa concorda com o valor deste módulo."
            value={value.offerModuleId ?? ''}
            onChange={(e) => set('offerModuleId', e.target.value || null)}
          >
            <option value="">— Nenhum (sem pergunta de valor) —</option>
            {references.modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.title}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Relevância mínima (0–100)"
            hint="0 = sempre perguntar. Ex.: 40 = só se o tema do módulo pontuar ≥ 40."
            type="number"
            min={0}
            max={100}
            value={value.priceQuestionMinScore}
            onChange={(e) => set('priceQuestionMinScore', Number(e.target.value))}
          />
          <CheckboxField
            className="self-center"
            label="Perguntar se concorda com o valor"
            checked={value.priceQuestionEnabled}
            onChange={(e) => set('priceQuestionEnabled', e.target.checked)}
          />
        </div>
      </fieldset>

      <div className="md:col-span-2">
        <p className="mb-1.5 text-sm font-medium text-slate-800">Exibir esta etapa quando…</p>
        <ConditionBuilder value={value.condition} onChange={(next) => set('condition', next)} references={references} emptyLabel="Sempre exibir" />
      </div>
      <CheckboxField label="Etapa ativa" checked={value.active} onChange={(e) => set('active', e.target.checked)} />
      <div className="md:col-span-2 space-y-3">
        <FormFeedback error={error} message={message} />
        <Button type="submit" loading={busy}>
          {value.id ? 'Salvar etapa' : 'Criar etapa'}
        </Button>
      </div>
    </form>
  );
}
