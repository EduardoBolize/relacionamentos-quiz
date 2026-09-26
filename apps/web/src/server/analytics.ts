import 'server-only';
import {
  CallbackTracker,
  CompositeTracker,
  ConsentGatedTracker,
  ConsoleTracker,
  SafeTracker,
  track,
  type AnalyticsEventName,
  type AnalyticsEventProps,
  type AnalyticsTracker,
} from '@relacionamentos/analytics';
import { db } from './db';
import { getEnv } from './env';

/**
 * Monta o rastreador: grava no banco próprio (e no console em desenvolvimento), somente com
 * consentimento, e sem nunca interromper o fluxo principal. Para enviar também a GA4, PostHog etc.,
 * adicione um adaptador à lista.
 */
export function createServerTracker(consent: boolean): AnalyticsTracker {
  const destinations: AnalyticsTracker[] = [
    new CallbackTracker(async (event) => {
      await db().analyticsEvent.create({
        data: {
          name: event.name,
          sessionId: event.sessionId ?? null,
          propsJson: JSON.stringify(event.props),
          createdAt: event.occurredAt,
        },
      });
    }),
  ];
  if (getEnv().NODE_ENV === 'development') destinations.push(new ConsoleTracker());
  return new SafeTracker(new ConsentGatedTracker(new CompositeTracker(destinations), () => consent));
}

export async function trackEvent<N extends AnalyticsEventName>(
  consent: boolean,
  name: N,
  props: AnalyticsEventProps<N>,
  sessionId?: string | null,
): Promise<void> {
  await track(createServerTracker(consent), name, props, sessionId);
}
