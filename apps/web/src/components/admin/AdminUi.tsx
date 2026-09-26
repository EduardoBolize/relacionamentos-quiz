'use client';

import type { ReactNode } from 'react';
import { Alert } from '@/components/ui/Feedback';
import type { ApiError } from '@/lib/api-client';
import { errorList } from './useAdminAction';

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-night-900">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function FormFeedback({ error, message }: { error: ApiError | null; message?: string | null }) {
  const errors = errorList(error);
  if (errors.length) {
    return (
      <Alert tone="error" title="Não foi possível salvar">
        <ul className="mt-1 list-disc pl-4">
          {errors.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </Alert>
    );
  }
  return message ? <Alert tone="success">{message}</Alert> : null;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 ${className}`}>{children}</div>;
}

export function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${active ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
      {active ? 'Ativo' : 'Inativo'}
    </span>
  );
}
