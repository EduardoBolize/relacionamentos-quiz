'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { CheckboxField, TextAreaField, TextField } from '@/components/ui/Field';
import { apiFetch } from '@/lib/api-client';
import { FormFeedback } from './AdminUi';
import { useAdminAction } from './useAdminAction';

export interface CategoryFormValue {
  id?: string;
  slug: string;
  name: string;
  shortDescription: string;
  explanation: string;
  color: string;
  position: number;
  active: boolean;
}

export const EMPTY_CATEGORY: CategoryFormValue = {
  slug: '',
  name: '',
  shortDescription: '',
  explanation: '',
  color: '#e0457b',
  position: 0,
  active: true,
};

export function CategoryForm({ initial }: { initial: CategoryFormValue }) {
  const [value, setValue] = useState(initial);
  const { run, busy, error, message } = useAdminAction();
  const set = <K extends keyof CategoryFormValue>(key: K, next: CategoryFormValue[K]) => setValue((current) => ({ ...current, [key]: next }));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const { id, ...body } = value;
    void run(() => apiFetch(id ? `/api/admin/categories/${id}` : '/api/admin/categories', { method: id ? 'PUT' : 'POST', body }), {
      success: id ? 'Categoria atualizada.' : 'Categoria criada.',
    }).then((created) => {
      if (!id && created) setValue(EMPTY_CATEGORY);
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <TextField label="Nome" value={value.name} onChange={(e) => set('name', e.target.value)} required />
      <TextField
        label="Identificador (slug)"
        hint="Letras minúsculas, números e hífens. Ex.: comunicacao"
        value={value.slug}
        onChange={(e) => set('slug', e.target.value)}
        required
      />
      <TextField
        className="md:col-span-2"
        label="Descrição curta"
        hint="Aparece na lista de pontuações do resultado."
        value={value.shortDescription}
        onChange={(e) => set('shortDescription', e.target.value)}
      />
      <TextAreaField
        className="md:col-span-2"
        label="Explicação cuidadosa (não diagnóstica)"
        hint="Exibida quando o tema se destaca. Evite rótulos; fale de possibilidades e acolhimento."
        rows={4}
        value={value.explanation}
        onChange={(e) => set('explanation', e.target.value)}
      />
      <div className="flex items-end gap-4">
        <TextField label="Cor" type="color" className="w-24" value={value.color} onChange={(e) => set('color', e.target.value)} />
        <TextField label="Ordem" type="number" min={0} className="w-28" value={value.position} onChange={(e) => set('position', Number(e.target.value))} />
      </div>
      <CheckboxField label="Categoria ativa (usada no quiz e nos resultados)" checked={value.active} onChange={(e) => set('active', e.target.checked)} className="self-end" />
      <div className="md:col-span-2 space-y-3">
        <FormFeedback error={error} message={message} />
        <Button type="submit" loading={busy}>
          {value.id ? 'Salvar categoria' : 'Criar categoria'}
        </Button>
      </div>
    </form>
  );
}
