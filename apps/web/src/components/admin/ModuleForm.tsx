'use client';

import { formatBRL, parseBRLToCents } from '@relacionamentos/payments/client';
import { useState, type FormEvent } from 'react';
import { SafeMarkdown } from '@/components/SafeMarkdown';
import { Button } from '@/components/ui/Button';
import { CheckboxField, TextAreaField, TextField } from '@/components/ui/Field';
import { apiFetch } from '@/lib/api-client';
import { isSafeExternalUrl } from '@/lib/links';
import { parseVideoUrl } from '@/lib/video';
import { FormFeedback } from './AdminUi';
import { useAdminAction } from './useAdminAction';

export interface VideoFormValue {
  id?: string;
  /** Chave local estável para a lista (aulas novas ainda não têm id). */
  key: string;
  title: string;
  durationSeconds: number;
  script: string;
  keyPoints: string;
  videoUrl: string;
  isPreview: boolean;
  active: boolean;
}

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
  checkoutUrl: string;
  position: number;
  active: boolean;
  categoryIds: string[];
  videos: VideoFormValue[];
}

let nextKey = 0;
export function newVideo(index: number): VideoFormValue {
  nextKey += 1;
  return {
    key: `novo-${nextKey}`,
    title: `Aula ${index + 1}`,
    durationSeconds: 60,
    script: '',
    keyPoints: '',
    videoUrl: '',
    isPreview: index === 0,
    active: true,
  };
}

export const EMPTY_MODULE: ModuleFormValue = {
  slug: '',
  title: '',
  subtitle: '',
  description: '',
  previewContent: '## O que você vai aprender\n- \n\n## Trecho do módulo\n> ',
  content: '## 1. \n',
  priceCents: 1500,
  coverEmoji: '📘',
  checkoutUrl: '',
  position: 0,
  active: true,
  categoryIds: [],
  videos: [newVideo(0), newVideo(1), newVideo(2)],
};

const MARKDOWN_HINT = 'Use ## para títulos, - ou 1. para listas, > para citações, **negrito** e *itálico*. HTML não é permitido.';
const VIDEO_HINT = 'YouTube (pode ser "não listado"), Vimeo, Panda Video ou arquivo .mp4. Vazio = aparece como "vídeo em produção".';

export function ModuleForm({ initial, categories }: { initial: ModuleFormValue; categories: { id: string; name: string }[] }) {
  const [value, setValue] = useState(initial);
  const [priceText, setPriceText] = useState(formatBRL(initial.priceCents).replace('R$ ', ''));
  const [priceError, setPriceError] = useState<string | null>(null);
  const [preview, setPreview] = useState<'previewContent' | 'content' | null>(null);
  const { run, busy, error, message } = useAdminAction();
  const set = <K extends keyof ModuleFormValue>(key: K, next: ModuleFormValue[K]) => setValue((current) => ({ ...current, [key]: next }));
  const setVideo = (index: number, patch: Partial<VideoFormValue>) =>
    set(
      'videos',
      value.videos.map((video, i) => (i === index ? { ...video, ...patch } : video)),
    );
  const moveVideo = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= value.videos.length) return;
    const videos = [...value.videos];
    [videos[index], videos[target]] = [videos[target]!, videos[index]!];
    set('videos', videos);
  };

  const checkoutUrlError = value.checkoutUrl.trim() && !isSafeExternalUrl(value.checkoutUrl.trim()) ? 'Use um endereço completo começando com https://' : null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const cents = parseBRLToCents(priceText);
    if (cents === null) {
      setPriceError('Informe um valor como 15,00.');
      return;
    }
    setPriceError(null);
    const { id, videos, ...rest } = value;
    const body = {
      ...rest,
      priceCents: cents,
      checkoutUrl: value.checkoutUrl.trim() || null,
      videos: videos.map((video) => ({
        id: video.id,
        title: video.title,
        durationSeconds: video.durationSeconds,
        script: video.script,
        keyPoints: video.keyPoints,
        videoUrl: video.videoUrl.trim() || null,
        isPreview: video.isPreview,
        active: video.active,
      })),
    };
    void run(() => apiFetch(id ? `/api/admin/modules/${id}` : '/api/admin/modules', { method: id ? 'PUT' : 'POST', body }), {
      success: id ? 'Módulo salvo.' : undefined,
      redirectTo: id ? undefined : '/admin/modulos',
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-2">
        <TextField label="Título" value={value.title} onChange={(e) => set('title', e.target.value)} required />
        <TextField label="Subtítulo" hint="Ex.: Módulo 1 · Amor-próprio, autoconhecimento e boas escolhas" value={value.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
        <TextField label="Identificador (slug)" hint="Aparece no endereço: /modulos/seu-slug" value={value.slug} onChange={(e) => set('slug', e.target.value)} required />
        <div className="grid grid-cols-3 gap-4">
          <TextField label="Preço (R$)" inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value)} error={priceError} />
          <TextField label="Emoji da capa" value={value.coverEmoji} onChange={(e) => set('coverEmoji', e.target.value)} maxLength={8} />
          <TextField label="Ordem" type="number" min={0} value={value.position} onChange={(e) => set('position', Number(e.target.value))} />
        </div>
        <TextAreaField className="md:col-span-2" label="Descrição curta" rows={2} value={value.description} onChange={(e) => set('description', e.target.value)} />
        <TextField
          className="md:col-span-2"
          label="Link de checkout externo (opcional)"
          hint="Ex.: o link de pagamento deste módulo na Kiwify. Preenchido, o botão de compra leva para lá em vez do checkout do site."
          placeholder="https://pay.kiwify.com.br/..."
          inputMode="url"
          value={value.checkoutUrl}
          onChange={(e) => set('checkoutUrl', e.target.value)}
          error={checkoutUrlError}
        />

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

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-night-900">Aulas em vídeo</h2>
            <p className="text-sm text-slate-600">
              Vídeos curtos (cerca de 1 minuto). O roteiro aparece como transcrição; os destaques aparecem enquanto o vídeo não é publicado.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => set('videos', [...value.videos, newVideo(value.videos.length)])}>
            + Adicionar aula
          </Button>
        </div>
        <ol className="mt-4 space-y-4">
          {value.videos.map((video, index) => {
            const urlError = video.videoUrl.trim() && !parseVideoUrl(video.videoUrl) ? 'Link não suportado. ' + VIDEO_HINT : null;
            return (
              <li key={video.id ?? video.key} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">Aula {index + 1}</p>
                  <div className="flex gap-1 text-sm">
                    <button type="button" className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40" onClick={() => moveVideo(index, -1)} disabled={index === 0} aria-label={`Mover aula ${index + 1} para cima`}>
                      ↑
                    </button>
                    <button type="button" className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40" onClick={() => moveVideo(index, 1)} disabled={index === value.videos.length - 1} aria-label={`Mover aula ${index + 1} para baixo`}>
                      ↓
                    </button>
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-red-700 hover:bg-red-50"
                      onClick={() => set('videos', value.videos.filter((_, i) => i !== index))}
                    >
                      Remover
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-4 md:grid-cols-[1fr_140px]">
                  <TextField label="Título da aula" value={video.title} onChange={(e) => setVideo(index, { title: e.target.value })} required />
                  <TextField
                    label="Duração (segundos)"
                    type="number"
                    min={5}
                    max={3600}
                    value={video.durationSeconds}
                    onChange={(e) => setVideo(index, { durationSeconds: Number(e.target.value) })}
                  />
                  <TextField
                    className="md:col-span-2"
                    label="Link do vídeo"
                    hint={VIDEO_HINT}
                    placeholder="https://youtu.be/..."
                    inputMode="url"
                    value={video.videoUrl}
                    onChange={(e) => setVideo(index, { videoUrl: e.target.value })}
                    error={urlError}
                  />
                  <TextAreaField
                    className="md:col-span-2"
                    label="Roteiro / transcrição"
                    rows={6}
                    value={video.script}
                    onChange={(e) => setVideo(index, { script: e.target.value })}
                  />
                  <TextAreaField
                    className="md:col-span-2"
                    label="Destaques na tela (um por linha)"
                    rows={3}
                    value={video.keyPoints}
                    onChange={(e) => setVideo(index, { keyPoints: e.target.value })}
                  />
                  <div className="flex flex-wrap gap-x-6 gap-y-2 md:col-span-2">
                    <CheckboxField label="Aula grátis (amostra na página do módulo)" checked={video.isPreview} onChange={(e) => setVideo(index, { isPreview: e.target.checked })} />
                    <CheckboxField label="Aula ativa" checked={video.active} onChange={(e) => setVideo(index, { active: e.target.checked })} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        {value.videos.length === 0 ? <p className="mt-3 text-sm text-slate-600">Nenhuma aula cadastrada.</p> : null}
      </section>

      {(['previewContent', 'content'] as const).map((field) => (
        <section key={field} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-night-900">{field === 'previewContent' ? 'Prévia gratuita' : 'Texto completo (após pagamento)'}</h2>
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
