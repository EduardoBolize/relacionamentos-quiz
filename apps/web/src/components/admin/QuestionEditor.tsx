'use client';

import type { Condition } from '@relacionamentos/quiz-engine';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { CheckboxField, SelectField, TextField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { apiFetch } from '@/lib/api-client';
import type { ReferenceData } from '@/server/services/admin-queries';
import { FormFeedback } from './AdminUi';
import { ConditionBuilder } from './ConditionBuilder';
import { useAdminAction } from './useAdminAction';

export interface OptionDraft {
  /** Id existente (preserva respostas e regras que apontam para a opção). */
  id?: string;
  /** Chave local para a lista do React. */
  key: string;
  label: string;
  weights: Record<string, number>;
}

export interface QuestionFormValue {
  id?: string;
  stageId: string;
  text: string;
  helpText: string;
  type: 'single' | 'multiple' | 'scale';
  required: boolean;
  maxSelections: number | null;
  scaleMinLabel: string;
  scaleMaxLabel: string;
  position: number;
  active: boolean;
  condition: Condition | null;
  options: OptionDraft[];
}

let keySeed = 0;
const newKey = () => `novo-${++keySeed}`;

interface QuestionEditorProps {
  initial: QuestionFormValue;
  stages: { id: string; title: string }[];
  categories: { id: string; name: string; color: string }[];
  references: ReferenceData;
}

export function QuestionEditor({ initial, stages, categories, references }: QuestionEditorProps) {
  const [value, setValue] = useState(initial);
  const { run, busy, error, message } = useAdminAction();
  const set = <K extends keyof QuestionFormValue>(key: K, next: QuestionFormValue[K]) => setValue((current) => ({ ...current, [key]: next }));

  const setOption = (index: number, option: OptionDraft) =>
    set('options', value.options.map((current, i) => (i === index ? option : current)));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.options.length) return;
    const next = [...value.options];
    [next[index], next[target]] = [next[target]!, next[index]!];
    set('options', next);
  };
  const generateScale = () => {
    if (value.options.length && !window.confirm('Substituir as opções atuais por uma escala de 0 a 5?')) return;
    set(
      'options',
      [0, 1, 2, 3, 4, 5].map((n) => ({ key: newKey(), label: String(n), weights: {} })),
    );
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const { id, options, helpText, scaleMinLabel, scaleMaxLabel, ...rest } = value;
    const body = {
      ...rest,
      helpText: helpText || null,
      scaleMinLabel: scaleMinLabel || null,
      scaleMaxLabel: scaleMaxLabel || null,
      options: options.map((option) => ({
        ...(option.id ? { id: option.id } : {}),
        label: option.label,
        weights: Object.fromEntries(Object.entries(option.weights).filter(([, weight]) => weight !== 0)),
      })),
    };
    void run(() => apiFetch<{ id: string }>(id ? `/api/admin/questions/${id}` : '/api/admin/questions', { method: id ? 'PUT' : 'POST', body }), {
      success: id ? 'Pergunta salva.' : undefined,
      redirectTo: id ? undefined : '/admin/perguntas',
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-2">
        <SelectField label="Etapa" value={value.stageId} onChange={(e) => set('stageId', e.target.value)}>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.title}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Tipo" value={value.type} onChange={(e) => set('type', e.target.value as QuestionFormValue['type'])}>
            <option value="single">Escolha única</option>
            <option value="multiple">Múltipla escolha</option>
            <option value="scale">Escala (0 a 5)</option>
          </SelectField>
          <TextField label="Ordem na etapa" type="number" min={0} value={value.position} onChange={(e) => set('position', Number(e.target.value))} />
        </div>
        <TextField className="md:col-span-2" label="Enunciado" value={value.text} onChange={(e) => set('text', e.target.value)} required />
        <TextField
          className="md:col-span-2"
          label="Texto de apoio (opcional)"
          value={value.helpText}
          onChange={(e) => set('helpText', e.target.value)}
        />
        {value.type === 'multiple' ? (
          <TextField
            label="Máximo de opções marcadas"
            type="number"
            min={1}
            value={value.maxSelections ?? ''}
            onChange={(e) => set('maxSelections', e.target.value ? Number(e.target.value) : null)}
          />
        ) : null}
        {value.type === 'scale' ? (
          <div className="grid grid-cols-2 gap-4 md:col-span-2">
            <TextField label="Rótulo do 0" value={value.scaleMinLabel} onChange={(e) => set('scaleMinLabel', e.target.value)} />
            <TextField label="Rótulo do 5" value={value.scaleMaxLabel} onChange={(e) => set('scaleMaxLabel', e.target.value)} />
          </div>
        ) : null}
        <div className="flex flex-wrap gap-6 md:col-span-2">
          <CheckboxField label="Obrigatória" checked={value.required} onChange={(e) => set('required', e.target.checked)} />
          <CheckboxField label="Ativa" checked={value.active} onChange={(e) => set('active', e.target.checked)} />
        </div>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-labelledby="pesos-titulo">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="pesos-titulo" className="text-lg font-bold text-night-900">Opções e pesos</h2>
            <p className="text-sm text-slate-600">
              Quantos pontos cada opção soma em cada categoria (−10 a 10). A pontuação final de cada tema é normalizada de 0 a 100.
            </p>
          </div>
          {value.type === 'scale' ? (
            <Button variant="secondary" size="sm" onClick={generateScale}>
              Gerar escala 0–5
            </Button>
          ) : null}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th scope="col" className="py-2 pr-2 font-semibold">Opção</th>
                {categories.map((category) => (
                  <th key={category.id} scope="col" className="px-1 py-2 text-center text-xs font-semibold">
                    <span className="mx-auto mb-1 block h-1.5 w-8 rounded-full" style={{ backgroundColor: category.color }} />
                    {category.name}
                  </th>
                ))}
                <th scope="col" className="sr-only">Ações</th>
              </tr>
            </thead>
            <tbody>
              {value.options.map((option, index) => (
                <tr key={option.id ?? option.key} className="border-b border-slate-100">
                  <td className="py-2 pr-2">
                    <input
                      aria-label={`Texto da opção ${index + 1}`}
                      className="w-full min-w-48 rounded-md border border-slate-300 px-2 py-1.5"
                      value={option.label}
                      onChange={(e) => setOption(index, { ...option, label: e.target.value })}
                      required
                    />
                  </td>
                  {categories.map((category) => (
                    <td key={category.id} className="px-1 py-2 text-center">
                      <input
                        aria-label={`Peso de "${option.label || `opção ${index + 1}`}" em ${category.name}`}
                        type="number"
                        min={-10}
                        max={10}
                        className={`w-16 rounded-md border px-1.5 py-1.5 text-center ${option.weights[category.id] ? 'border-brand-300 bg-brand-50 font-semibold' : 'border-slate-300'}`}
                        value={option.weights[category.id] ?? 0}
                        onChange={(e) => setOption(index, { ...option, weights: { ...option.weights, [category.id]: Number(e.target.value) } })}
                      />
                    </td>
                  ))}
                  <td className="py-2 pl-2 whitespace-nowrap">
                    <button type="button" aria-label="Mover para cima" className="rounded p-1 hover:bg-slate-100" onClick={() => move(index, -1)}>
                      <Icon name="chevronUp" className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Mover para baixo" className="rounded p-1 hover:bg-slate-100" onClick={() => move(index, 1)}>
                      <Icon name="chevronDown" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Remover opção"
                      className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700"
                      onClick={() => set('options', value.options.filter((_, i) => i !== index))}
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
          onClick={() => set('options', [...value.options, { key: newKey(), label: '', weights: {} }])}
        >
          <Icon name="plus" className="h-4 w-4" /> Adicionar opção
        </button>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-bold text-night-900">Exibir esta pergunta quando…</h2>
        <p className="mb-3 text-sm text-slate-600">
          Use respostas anteriores ou a pontuação parcial de uma categoria para tornar o quiz adaptativo.
        </p>
        <ConditionBuilder
          value={value.condition}
          onChange={(next) => set('condition', next)}
          references={references}
          excludeQuestionId={value.id}
          emptyLabel="Sempre exibir"
        />
      </section>

      <div className="space-y-3">
        <FormFeedback error={error} message={message} />
        <Button type="submit" size="lg" loading={busy}>
          {value.id ? 'Salvar pergunta' : 'Criar pergunta'}
        </Button>
      </div>
    </form>
  );
}
