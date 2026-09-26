import { describe, expect, it, vi } from 'vitest';
import {
  CallbackTracker,
  CompositeTracker,
  ConsentGatedTracker,
  MemoryTracker,
  SafeTracker,
  buildFunnel,
  createEvent,
  isClientEventName,
  track,
  type AnalyticsEvent,
} from '../src';

const event = (name: string, props: unknown) =>
  ({ name, props, sessionId: 's1', occurredAt: new Date() }) as AnalyticsEvent;

describe('catálogo de eventos', () => {
  it('aceita eventos conhecidos com propriedades válidas', () => {
    expect(createEvent('payment_method_selected', { method: 'pix' })).toMatchObject({
      name: 'payment_method_selected',
      props: { method: 'pix' },
    });
  });

  it('descarta eventos desconhecidos, propriedades extras (possíveis dados pessoais) e valores inválidos', () => {
    expect(createEvent('evento_inventado', {})).toBeNull();
    expect(createEvent('payment_method_selected', { method: 'pix', email: 'a@b.com' })).toBeNull();
    expect(createEvent('payment_method_selected', { method: 'bitcoin' })).toBeNull();
    expect(createEvent('__proto__', {})).toBeNull();
  });

  it('só permite que o navegador envie eventos da lista de eventos de cliente', () => {
    expect(isClientEventName('checkout_viewed')).toBe(true);
    expect(isClientEventName('payment_approved')).toBe(false);
  });
});

describe('adaptadores', () => {
  it('SafeTracker revalida e engole erros do destino', async () => {
    const onError = vi.fn();
    const failing = new CallbackTracker(async () => {
      throw new Error('banco fora do ar');
    });
    const safe = new SafeTracker(failing, onError);
    await expect(safe.track(event('result_viewed', { recovered: false }))).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledOnce();

    const memory = new MemoryTracker();
    await new SafeTracker(memory).track(event('result_viewed', { recovered: 'sim' }));
    expect(memory.events).toHaveLength(0);
  });

  it('ConsentGatedTracker respeita o consentimento', async () => {
    const memory = new MemoryTracker();
    let consent = false;
    const gated = new ConsentGatedTracker(memory, () => consent);
    await track(gated, 'checkout_viewed', { moduleCount: 1 });
    consent = true;
    await track(gated, 'checkout_viewed', { moduleCount: 2 });
    expect(memory.events.map((e) => e.props)).toEqual([{ moduleCount: 2 }]);
  });

  it('CompositeTracker entrega para todos mesmo se um falhar', async () => {
    const memory = new MemoryTracker();
    const failing = new CallbackTracker(async () => {
      throw new Error('x');
    });
    await new CompositeTracker([failing, memory]).track(event('quiz_started', {}));
    expect(memory.names()).toEqual(['quiz_started']);
  });
});

describe('funil', () => {
  it('calcula as conversões entre os passos', () => {
    const funnel = buildFunnel({ quiz_started: 200, quiz_completed: 150, checkout_viewed: 60, order_created: 30, payment_approved: 15 });
    expect(funnel.map((s) => s.count)).toEqual([200, 150, 60, 30, 15]);
    expect(funnel[1]).toMatchObject({ rateFromPrevious: 75, rateFromStart: 75 });
    expect(funnel[4]).toMatchObject({ rateFromPrevious: 50, rateFromStart: 7.5 });
    expect(funnel[0]).toMatchObject({ rateFromPrevious: null, rateFromStart: null });
  });

  it('lida com funil vazio sem dividir por zero', () => {
    const funnel = buildFunnel({});
    expect(funnel.every((s) => s.count === 0 && s.rateFromStart === null && s.rateFromPrevious === null)).toBe(true);
  });
});
