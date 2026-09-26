import { z } from 'zod';

/**
 * Catálogo de eventos de analytics.
 *
 * Regras de privacidade (LGPD):
 * - nenhum evento carrega nome, e-mail, CPF, texto livre ou o conteúdo das respostas;
 * - a sessão é identificada apenas por um pseudônimo (id interno);
 * - os esquemas são `strict`: qualquer campo extra faz o evento ser descartado.
 */

const id = z.string().min(1).max(80);
const method = z.enum(['pix', 'boleto', 'card']);

export const analyticsEventSchemas = {
  quiz_started: z.object({ source: z.string().max(40).optional() }).strict(),
  step_answered: z
    .object({
      stepId: id,
      stepKind: z.enum(['question', 'price']),
      stageId: id,
      msOnStep: z.number().int().min(0).max(3_600_000).optional(),
    })
    .strict(),
  price_question_answered: z
    .object({
      moduleId: id,
      priceCents: z.number().int().min(0),
      response: z.enum(['agree', 'maybe', 'disagree']),
    })
    .strict(),
  quiz_completed: z
    .object({
      primaryCategoryId: id.nullable(),
      secondaryCount: z.number().int().min(0).max(10),
      flags: z.array(z.string().max(40)).max(10),
    })
    .strict(),
  result_viewed: z.object({ recovered: z.boolean() }).strict(),
  module_preview_opened: z
    .object({ moduleId: id, origin: z.enum(['result', 'price_step', 'module_page']) })
    .strict(),
  checkout_viewed: z.object({ moduleCount: z.number().int().min(0).max(50) }).strict(),
  payment_method_selected: z.object({ method }).strict(),
  order_created: z
    .object({ method, totalCents: z.number().int().min(0), moduleCount: z.number().int().min(1).max(50) })
    .strict(),
  payment_approved: z.object({ method, totalCents: z.number().int().min(0) }).strict(),
  payment_failed: z.object({ method, reason: z.string().max(120).optional() }).strict(),
  result_recovery_requested: z.object({}).strict(),
  result_recovered: z.object({ via: z.enum(['link', 'email', 'cookie']) }).strict(),
} as const;

export type AnalyticsEventName = keyof typeof analyticsEventSchemas;
export type AnalyticsEventProps<N extends AnalyticsEventName> = z.infer<(typeof analyticsEventSchemas)[N]>;

export interface AnalyticsEvent<N extends AnalyticsEventName = AnalyticsEventName> {
  name: N;
  props: AnalyticsEventProps<N>;
  /** Pseudônimo da sessão do quiz (id interno) — nunca e-mail ou nome. */
  sessionId?: string | null;
  occurredAt: Date;
}

export const ANALYTICS_EVENT_NAMES = Object.keys(analyticsEventSchemas) as AnalyticsEventName[];

/** Eventos que o navegador pode enviar. Todos os demais são registrados apenas pelo servidor. */
export const CLIENT_EVENT_NAMES = [
  'module_preview_opened',
  'checkout_viewed',
  'payment_method_selected',
] as const satisfies readonly AnalyticsEventName[];

export type ClientEventName = (typeof CLIENT_EVENT_NAMES)[number];

export function isAnalyticsEventName(name: unknown): name is AnalyticsEventName {
  return typeof name === 'string' && Object.hasOwn(analyticsEventSchemas, name);
}

export function isClientEventName(name: unknown): name is ClientEventName {
  return typeof name === 'string' && (CLIENT_EVENT_NAMES as readonly string[]).includes(name);
}

/** Valida nome e propriedades. Retorna `null` para eventos desconhecidos ou fora do esquema. */
export function createEvent(
  name: string,
  props: unknown,
  sessionId?: string | null,
  occurredAt: Date = new Date(),
): AnalyticsEvent | null {
  if (!isAnalyticsEventName(name)) return null;
  const parsed = analyticsEventSchemas[name].safeParse(props ?? {});
  if (!parsed.success) return null;
  return { name, props: parsed.data, sessionId: sessionId ?? null, occurredAt } as AnalyticsEvent;
}
