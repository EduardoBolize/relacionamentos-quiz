import { createEvent, type AnalyticsEvent, type AnalyticsEventName, type AnalyticsEventProps } from './events';

/**
 * Adaptadores de analytics. A aplicação depende apenas de `AnalyticsTracker`; trocar o destino
 * (banco próprio, GA4, PostHog, Segment…) é uma questão de criar um novo adaptador.
 */
export interface AnalyticsTracker {
  track(event: AnalyticsEvent): Promise<void>;
}

export class NoopTracker implements AnalyticsTracker {
  async track(): Promise<void> {}
}

/** Guarda eventos em memória (útil em testes). */
export class MemoryTracker implements AnalyticsTracker {
  readonly events: AnalyticsEvent[] = [];
  async track(event: AnalyticsEvent): Promise<void> {
    this.events.push(event);
  }
  names(): string[] {
    return this.events.map((event) => event.name);
  }
}

export class ConsoleTracker implements AnalyticsTracker {
  constructor(private readonly log: (message: string) => void = (m) => console.info(m)) {}
  async track(event: AnalyticsEvent): Promise<void> {
    this.log(`[analytics] ${event.name} ${JSON.stringify(event.props)}`);
  }
}

/** Delega a persistência para uma função injetada (ex.: gravar no banco via Prisma). */
export class CallbackTracker implements AnalyticsTracker {
  constructor(private readonly persist: (event: AnalyticsEvent) => Promise<void>) {}
  track(event: AnalyticsEvent): Promise<void> {
    return this.persist(event);
  }
}

/** Envia para vários destinos; a falha de um não impede os demais. */
export class CompositeTracker implements AnalyticsTracker {
  constructor(private readonly trackers: readonly AnalyticsTracker[]) {}
  async track(event: AnalyticsEvent): Promise<void> {
    await Promise.allSettled(this.trackers.map((tracker) => tracker.track(event)));
  }
}

/**
 * Só repassa o evento quando há consentimento. Analytics comportamental é opcional (LGPD):
 * sem consentimento, nada é registrado.
 */
export class ConsentGatedTracker implements AnalyticsTracker {
  constructor(
    private readonly inner: AnalyticsTracker,
    private readonly hasConsent: () => boolean | Promise<boolean>,
  ) {}
  async track(event: AnalyticsEvent): Promise<void> {
    if (await this.hasConsent()) await this.inner.track(event);
  }
}

/**
 * Camada de segurança: revalida o evento contra o catálogo e **nunca** deixa um erro de analytics
 * quebrar o fluxo da pessoa (quiz, checkout…).
 */
export class SafeTracker implements AnalyticsTracker {
  constructor(
    private readonly inner: AnalyticsTracker,
    private readonly onError: (error: unknown) => void = (error) => console.warn('[analytics] falha ao registrar evento', error),
  ) {}

  async track(event: AnalyticsEvent): Promise<void> {
    const valid = createEvent(event.name, event.props, event.sessionId, event.occurredAt);
    if (!valid) return;
    try {
      await this.inner.track(valid);
    } catch (error) {
      this.onError(error);
    }
  }
}

/** Atalho tipado para registrar um evento. */
export function track<N extends AnalyticsEventName>(
  tracker: AnalyticsTracker,
  name: N,
  props: AnalyticsEventProps<N>,
  sessionId?: string | null,
): Promise<void> {
  return tracker.track({ name, props, sessionId: sessionId ?? null, occurredAt: new Date() } as AnalyticsEvent);
}
