'use client';

import { formatBRL, parseBRLToCents } from '@relacionamentos/payments/client';
import { useState, type FormEvent } from 'react';
import { SafeMarkdown } from '@/components/SafeMarkdown';
import { Button } from '@/components/ui/Button';
import { CheckboxField, TextAreaField, TextField } from '@/components/ui/Field';
import { apiFetch } from '@/lib/api-client';
import { FormFeedback } from './AdminUi';
import { useAdminAction } from './useAdminAction';

export interface ModuleFormValue {
  id?: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  previewContent: string;
  content: string;
  priceCents: number;
  coverEmoji: string;
  position: number;
  active: boolean;
  categoryIds: string[];
}

export const EMPTY_MODULE: ModuleFormValue = {
  slug: '',
  title: '',
  subtitle: '',
  description: '',
  previewContent: '## O que você vai encontrar\n- \n\n## Trecho do módulo\n> ',
  content: '## 1. \n',
  priceCents: 1990,
  coverEmoji: '📘',
  position: 0,
  active: true,
  categoryIds: [],
};

const MARKDOWN_HINT = 'Use ## para títulos, - para listas, > para citações, **negrito** e *itálico*. HTML não é permitido.';

export function ModuleForm({ initial, categories }: { initial: ModuleFormValue; categories: { id: string; name: string }[] }) {
  const [value, setValue] = useState(initial);
  const [priceText, setPriceText] = useState(formatBRL(initial.priceCents).replace('R$ ', ''));
  const [priceError, setPriceError] = useState<string | null>(null);
  const [preview, setPreview] = useState<'previewContent' | 'content' | null>(null);
  const { run, busy, error, message } = useAdminAction();
  const set = <K extends keyof ModuleFormValue>(key: K, next: ModuleFormValue[K]) => setValue((current) => ({ ...current, [key]: next }));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const cents = parseBRLToCents(priceText);
    if (cents === null) {
      setPriceError('Informe um valor como 29,90.');
      return;
    }
    setPriceError(null);
    const { id, ...rest } = value;
    const body = { ...rest, priceCents: cents };
    void run(() => apiFetch(id ? `/api/admin/modules/${id}` : '/api/admin/modules', { method: id ? 'PUT' : 'POST', body }), {
      success: id ? 'Módulo salvo.' : undefined,
      redirectTo: id ? undefined : '/admin/modulos',
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-2">
        <TextField label="Título" value={value.title} onChange={(e) => set('title', e.target.value)} required />
        <TextField label="Subtítulo" hint="Ex.: Módulo 1 · Como falar e escutar sem ruído" value={value.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
        <TextField label="Identificador (slug)" hint="Aparece no endereço: /modulos/seu-slug" value={value.slug} onChange={(e) => set('slug', e.target.value)} required />
        <div className="grid grid-cols-3 gap-4">
          <TextField label="Preço (R$)" inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value)} error={priceError} />
          <TextField label="Emoji da capa" value={value.coverEmoji} onChange={(e) => set('coverEmoji', e.target.value)} maxLength={8} />
          <TextField label="Ordem" type="number" min={0} value={value.position} onChange={(e) => set('position', Number(e.target.value))} />
        </div>
        <TextAreaField className="md:col-span-2" label="Descrição curta" rows={2} value={value.description} onChange={(e) => set('description', e.target.value)} />

        <fieldset className="md:col-span-2">
          <legend className="mb-1.5 text-sm font-medium text-slate-800">Categorias relacionadas (usadas na recomendação)</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {categories.map((category) => (
              <label key={category.id} className="inline-flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  className="accent-brand-600"
                  checked={value.categoryIds.includes(category.id)}
                  onChange={(e) =>
                    set('categoryIds', e.target.checked ? [...value.categoryIds, category.id] : value.categoryIds.filter((id) => id !== category.id))
                  }
                />
                {category.name}
              </label>
            ))}
          </div>
        </fieldset>
        <CheckboxField label="Módulo ativo (visível e à venda)" checked={value.active} onChange={(e) => set('active', e.target.checked)} />
      </div>

      {(['previewContent', 'content'] as const).map((field) => (
        <section key={field} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-night-900">{field === 'previewContent' ? 'Prévia gratuita' : 'Conteúdo completo (após pagamento)'}</h2>
            <button type="button" className="text-sm font-medium text-brand-700 hover:underline" onClick={() => setPreview(preview === field ? null : field)}>
              {preview === field ? 'Editar' : 'Pré-visualizar'}
            </button>
          </div>
          {preview === field ? (
            <div className="mt-4 rounded-xl border border-slate-200 p-4">
              <SafeMarkdown source={value[field]} />
            </div>
          ) : (
            <TextAreaField
              className="mt-3"
              label={field === 'previewContent' ? 'Texto da prévia' : 'Texto completo'}
              hint={MARKDOWN_HINT}
              rows={field === 'previewContent' ? 10 : 18}
              value={value[field]}
              onChange={(e) => set(field, e.target.value)}
            />
          )}
        </section>
      ))}

      <div className="space-y-3">
        <FormFeedback error={error} message={message} />
        <Button type="submit" size="lg" loading={busy}>
          {value.id ? 'Salvar módulo' : 'Criar módulo'}
        </Button>
      </div>
    </form>
  );
}
