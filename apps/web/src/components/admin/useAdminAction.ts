'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { ApiError } from '@/lib/api-client';

/**
 * Executa uma ação do painel (salvar, excluir…) com estado de carregamento, mensagem de erro
 * amigável e atualização dos dados da página ao final.
 */
export function useAdminAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(action: () => Promise<T>, options: { success?: string; redirectTo?: string } = {}): Promise<T | undefined> => {
      setBusy(true);
      setError(null);
      setMessage(null);
      try {
        const result = await action();
        if (options.redirectTo) router.push(options.redirectTo);
        router.refresh();
        if (options.success) setMessage(options.success);
        return result;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push('/admin/login');
          return undefined;
        }
        setError(err instanceof ApiError ? err : new ApiError(0, 'unknown', 'Não foi possível concluir a ação.'));
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  return { run, busy, error, message, setMessage };
}

/** Lista legível dos erros de validação retornados pela API. */
export function errorList(error: ApiError | null): string[] {
  if (!error) return [];
  if (!error.details) return [error.message];
  return Object.entries(error.details).flatMap(([field, messages]) =>
    (messages ?? []).map((message) => (field === '_' ? message : `${field}: ${message}`)),
  );
}
