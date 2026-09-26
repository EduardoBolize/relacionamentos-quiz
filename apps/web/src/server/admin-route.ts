import 'server-only';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdminApi, type AdminContext } from './auth/admin-auth';
import { route } from './http';
import { readJson } from './security/request';

interface AdminHandlerArgs<P> {
  request: NextRequest;
  admin: AdminContext;
  params: P;
  /** Lê o corpo JSON (a validação detalhada fica no serviço). */
  body: (maxBytes?: number) => Promise<unknown>;
}

/**
 * Rota do painel: exige sessão de administrador válida e (em métodos de escrita) a verificação
 * de origem contra CSRF — antes de qualquer outra coisa.
 */
export function adminRoute<P = Record<string, never>>(handler: (args: AdminHandlerArgs<P>) => Promise<Response>) {
  return route<{ params: Promise<P> }>(async (request, context) => {
    const admin = await requireAdminApi(request);
    const params = (context?.params ? await context.params : {}) as P;
    return handler({ request, admin, params, body: (maxBytes) => readJson(request, z.unknown(), maxBytes) });
  });
}
