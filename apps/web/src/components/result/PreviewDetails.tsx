'use client';

import type { ReactNode } from 'react';
import { trackClientEvent } from '@/lib/consent';

/** Prévia expansível do módulo (registra a abertura, se houver consentimento). */
export function PreviewDetails({ moduleId, children }: { moduleId: string; children: ReactNode }) {
  return (
    <details
      className="group mt-4 rounded-xl border border-slate-200 bg-slate-50"
      onToggle={(event) => {
        if ((event.currentTarget as HTMLDetailsElement).open) trackClientEvent('module_preview_opened', { moduleId, origin: 'result' });
      }}
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-brand-700 hover:text-brand-800">
        <span className="group-open:hidden">Ler a prévia gratuita ▾</span>
        <span className="hidden group-open:inline">Fechar prévia ▴</span>
      </summary>
      <div className="border-t border-slate-200 px-4 py-4 text-sm text-slate-700">{children}</div>
    </details>
  );
}
