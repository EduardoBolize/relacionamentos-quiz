'use client';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { apiFetch } from '@/lib/api-client';
import { useAdminAction } from './useAdminAction';

/** Exclusão com confirmação explícita. */
export function DeleteButton({
  endpoint,
  confirmText,
  redirectTo,
  label = 'Excluir',
}: {
  endpoint: string;
  confirmText: string;
  redirectTo?: string;
  label?: string;
}) {
  const { run, busy, error } = useAdminAction();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        variant="danger"
        size="sm"
        loading={busy}
        onClick={() => {
          if (!window.confirm(confirmText)) return;
          void run(() => apiFetch(endpoint, { method: 'DELETE' }), { redirectTo });
        }}
      >
        <Icon name="trash" className="h-4 w-4" /> {label}
      </Button>
      {error ? <span className="max-w-xs text-xs text-red-700" role="alert">{error.message}</span> : null}
    </span>
  );
}
