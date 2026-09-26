import type { ApiErrorBody } from './dto';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** `fetch` para a própria API: JSON, mesma origem, sem cache e com mensagens de erro amigáveis. */
export async function apiFetch<T>(
  path: string,
  init: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown; signal?: AbortSignal; keepalive?: boolean } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: 'same-origin',
      cache: 'no-store',
      signal: init.signal,
      keepalive: init.keepalive,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError(0, 'network_error', 'Sem conexão. Verifique sua internet e tente novamente.');
  }

  if (response.status === 204) return undefined as T;
  const data = (await response.json().catch(() => null)) as (T & Partial<ApiErrorBody>) | null;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error?.code ?? 'error',
      data?.error?.message ?? 'Algo deu errado. Tente novamente.',
      data?.error?.details,
    );
  }
  return data as T;
}

/** Primeira mensagem de erro de um campo (retornada pela validação do servidor). */
export function fieldError(error: unknown, field: string): string | null {
  if (!(error instanceof ApiError) || !error.details) return null;
  return error.details[field]?.[0] ?? null;
}
