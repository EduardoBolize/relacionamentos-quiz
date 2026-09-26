import 'server-only';
import { AnswerError } from '@relacionamentos/quiz-engine';
import { PaymentError, WebhookSignatureError } from '@relacionamentos/payments';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function json<T>(data: T, init: ResponseInit = {}): NextResponse<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-store');
  return NextResponse.json(data, { ...init, headers });
}

export interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

function errorResponse(status: number, code: string, message: string, details?: unknown, headers?: HeadersInit) {
  return json<ErrorBody>({ error: { code, message, ...(details === undefined ? {} : { details }) } }, { status, headers });
}

/** Converte exceções conhecidas em respostas JSON padronizadas; erros inesperados viram 500 genérico. */
export function toErrorResponse(error: unknown): NextResponse<ErrorBody> {
  if (error instanceof HttpError) {
    const headers =
      error.status === 429 && typeof error.details === 'object' && error.details && 'retryAfter' in error.details
        ? { 'Retry-After': String((error.details as { retryAfter: number }).retryAfter) }
        : undefined;
    return errorResponse(error.status, error.code, error.message, error.status === 429 ? undefined : error.details, headers);
  }
  if (error instanceof AnswerError) return errorResponse(422, error.code, error.message);
  if (error instanceof PaymentError) return errorResponse(422, error.code, error.message);
  if (error instanceof WebhookSignatureError) return errorResponse(400, 'invalid_signature', 'Assinatura inválida.');
  if (error instanceof z.ZodError) {
    // `{ "customer.email": ["Informe um e-mail válido."] }` — o navegador exibe junto do campo.
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.map(String).join('.') || '_';
      (details[key] ??= []).push(issue.message);
    }
    return errorResponse(400, 'invalid_input', 'Confira os dados informados.', details);
  }
  console.error('[api] erro inesperado', error);
  return errorResponse(500, 'internal_error', 'Não foi possível concluir a operação. Tente novamente.');
}

type Handler<C> = (request: NextRequest, context: C) => Promise<Response>;

/** Envolve um route handler com tratamento de erros padronizado. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
