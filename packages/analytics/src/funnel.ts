import type { AnalyticsEventName } from './events';

export interface FunnelStepDef {
  event: AnalyticsEventName;
  label: string;
}

export const DEFAULT_FUNNEL: readonly FunnelStepDef[] = [
  { event: 'quiz_started', label: 'Iniciaram o quiz' },
  { event: 'quiz_completed', label: 'Concluíram o quiz' },
  { event: 'checkout_viewed', label: 'Abriram o checkout' },
  { event: 'order_created', label: 'Geraram pedido' },
  { event: 'payment_approved', label: 'Pagamento aprovado' },
];

export interface FunnelStep extends FunnelStepDef {
  count: number;
  /** Conversão em relação ao passo anterior (0–100). */
  rateFromPrevious: number | null;
  /** Conversão em relação ao primeiro passo (0–100). */
  rateFromStart: number | null;
}

const rate = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

/** Monta o funil a partir da contagem de eventos (ou sessões distintas) por nome. */
export function buildFunnel(
  counts: Partial<Record<AnalyticsEventName, number>>,
  steps: readonly FunnelStepDef[] = DEFAULT_FUNNEL,
): FunnelStep[] {
  const first = counts[steps[0]?.event ?? 'quiz_started'] ?? 0;
  return steps.map((step, index) => {
    const count = counts[step.event] ?? 0;
    const previous = index === 0 ? null : (counts[steps[index - 1]!.event] ?? 0);
    return {
      ...step,
      count,
      rateFromPrevious: previous === null ? null : rate(count, previous),
      rateFromStart: index === 0 ? null : rate(count, first),
    };
  });
}
