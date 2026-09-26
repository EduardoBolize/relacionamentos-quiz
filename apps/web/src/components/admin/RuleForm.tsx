'use client';

import type { Condition, RuleEffect } from '@relacionamentos/quiz-engine';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { CheckboxField, TextAreaField, TextField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { apiFetch } from '@/lib/api-client';
import type { ReferenceData } from '@/server/services/admin-queries';
import { FormFeedback } from './AdminUi';
import { ConditionBuilder } from './ConditionBuilder';
import { useAdminAction } from './useAdminAction';

export interface RuleFormValue {
  id?: string;
  name: string;
  description: string;
  priority: number;
  active: boolean;
  condition: Condition | null;
  effects: RuleEffect[];
}

export const EMPTY_RULE: RuleFormValue = {
  name: '',
  description: '',
  priority: 0,
  active: true,
  condition: null,
  effects: [],
};

const EFFECT_LABELS: Record<RuleEffect['type'], string> = {
  addScore: 'Somar pontos a uma categoria',
  multiplyScore: 'Multiplicar a pontuação de uma categoria',
  recommendModule: 'Recomendar um módulo',
  addFlag: 'Adicionar sinalizador',
};

function defaultEffect(type: RuleEffect['type'], references: ReferenceData): RuleEffect {
  const categoryId = references.categories[0]?.id ?? '';
  switch (type) {
    case 'addScore':
      return { type, categoryId, value: 10 };
    case 'multiplyScore':
      return { type, categoryId, factor: 1.2 };
    case 'recommendModule':
      return { type, moduleId: references.modules[0]?.id ?? '' };
    case 'addFlag':
      return { type, flag: 'safety_support' };
  }
}

export function RuleForm({ initial, references }: { initial: RuleFormValue; references: ReferenceData }) {
  const [value, setValue] = useState(initial);
  const { run, busy, error, message } = useAdminAction();
  const set = <K extends keyof RuleFormValue>(key: K, next: RuleFormValue[K]) => setValue((current) => ({ ...current, [key]: next }));
  const setEffect = (index: number, effect: RuleEffect) => set('effects', value.effects.map((current, i) => (i === index ? effect : current)));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const { id, condition, ...rest } = value;
    // Regra sem condição = sempre se aplica (grupo "todas" vazio).
    const body = { ...rest, condition: condition ?? { all: [] } };
    void run(() => apiFetch(id ? `/api/admin/rules/${id}` : '/api/admin/rules', { method: id ? 'PUT' : 'POST', body }), {
      success: id ? 'Regra atualizada.' : 'Regra criada.',
    }).then((created) => {
      if (!id && created) setValue(EMPTY_RULE);
    });
  };

  const categorySelect = (current: string, onChange: (id: string) => void) => (
    <select aria-label="Categoria" className="rounded-md border border-slate-300 bg-white px-2 py-1" value={current} onChange={(e) => onChange(e.target.value)}>
      {references.categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <TextField label="Nome da regra" value={value.name} onChange={(e) => set('name', e.target.value)} required />
      <TextField
        label="Prioridade"
        hint="Regras de prioridade maior têm seus efeitos aplicados primeiro."
        type="number"
        value={value.priority}
        onChange={(e) => set('priority', Number(e.target.value))}
      />
      <TextAreaField className="md:col-span-2" label="Descrição (para a equipe)" rows={2} value={value.description} onChange={(e) => set('description', e.target.value)} />

      <div className="md:col-span-2">
        <p className="mb-1.5 text-sm font-medium text-slate-800">Quando aplicar</p>
        <ConditionBuilder value={value.condition} onChange={(next) => set('condition', next)} references={references} emptyLabel="Sempre aplicar" />
        <p className="mt-1 text-xs text-slate-500">Cláusulas de pontuação usam a pontuação base (antes de qualquer regra).</p>
      </div>

      <fieldset className="md:col-span-2 space-y-2">
        <legend className="mb-1.5 text-sm font-medium text-slate-800">Efeitos</legend>
        {value.effects.length === 0 ? <p className="text-sm text-slate-500">Adicione ao menos um efeito.</p> : null}
        {value.effects.map((effect, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
            <span className="font-medium">{EFFECT_LABELS[effect.type]}:</span>
            {effect.type === 'addScore' ? (
              <>
                {categorySelect(effect.categoryId, (categoryId) => setEffect(index, { ...effect, categoryId }))}
                <input
                  aria-label="Pontos"
                  type="number"
                  min={-100}
                  max={100}
                  className="w-24 rounded-md border border-slate-300 px-2 py-1"
                  value={effect.value}
                  onChange={(e) => setEffect(index, { ...effect, value: Number(e.target.value) })}
                />
                <span>pontos</span>
              </>
            ) : null}
            {effect.type === 'multiplyScore' ? (
              <>
                {categorySelect(effect.categoryId, (categoryId) => setEffect(index, { ...effect, categoryId }))}
                <span>×</span>
                <input
                  aria-label="Fator"
                  type="number"
                  step="0.05"
                  min={0}
                  max={10}
                  className="w-24 rounded-md border border-slate-300 px-2 py-1"
                  value={effect.factor}
                  onChange={(e) => setEffect(index, { ...effect, factor: Number(e.target.value) })}
                />
              </>
            ) : null}
            {effect.type === 'recommendModule' ? (
              <select
                aria-label="Módulo"
                className="rounded-md border border-slate-300 bg-white px-2 py-1"
                value={effect.moduleId}
                onChange={(e) => setEffect(index, { ...effect, moduleId: e.target.value })}
              >
                {references.modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.title}
                  </option>
                ))}
              </select>
            ) : null}
            {effect.type === 'addFlag' ? (
              <>
                <input
                  aria-label="Sinalizador"
                  className="w-48 rounded-md border border-slate-300 px-2 py-1 font-mono"
                  value={effect.flag}
                  onChange={(e) => setEffect(index, { ...effect, flag: e.target.value })}
                />
                <span className="text-xs text-slate-500">“safety_support” exibe os canais de apoio antes das ofertas.</span>
              </>
            ) : null}
            <button
              type="button"
              aria-label="Remover efeito"
              className="ml-auto rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700"
              onClick={() => set('effects', value.effects.filter((_, i) => i !== index))}
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(EFFECT_LABELS) as RuleEffect['type'][]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => set('effects', [...value.effects, defaultEffect(type, references)])}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              <Icon name="plus" className="h-4 w-4" /> {EFFECT_LABELS[type]}
            </button>
          ))}
        </div>
      </fieldset>

      <CheckboxField label="Regra ativa" checked={value.active} onChange={(e) => set('active', e.target.checked)} />
      <div className="md:col-span-2 space-y-3">
        <FormFeedback error={error} message={message} />
        <Button type="submit" loading={busy}>
          {value.id ? 'Salvar regra' : 'Criar regra'}
        </Button>
      </div>
    </form>
  );
}
