import { conditionSchema } from '@relacionamentos/quiz-engine';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as forgetRoute } from '@/app/api/quiz/session/forget/route';
import { getEnv, resetEnvCache } from '@/server/env';
import { HttpError } from '@/server/http';
import {
  MAX_BUCKETS,
  enforceClientRateLimit,
  enforceRateLimit,
  rateLimitBucketCount,
  resetRateLimits,
} from '@/server/security/rate-limit';
import { getClientIp, readBodyText } from '@/server/security/request';
import { questionInputSchema } from '@/server/services/admin-content';
import { ORIGIN } from './helpers';
import { TEST_ENV } from './test-env';

/**
 * Regressões dos problemas encontrados na revisão de segurança (ver docs/SEGURANCA.md).
 */

function withEnv(overrides: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetEnvCache();
}

beforeEach(() => resetRateLimits());
afterEach(() => {
  withEnv({ ...TEST_ENV, TRUST_PROXY: undefined, ALLOW_DEMO_PROVIDERS: undefined });
});

const req = (headers: Record<string, string>) => new Request(`${ORIGIN}/api/teste`, { headers });

describe('IP do cliente atrás de proxies', () => {
  it('sem proxy confiável, ignora o X-Forwarded-For (o cliente pode forjá-lo)', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '203.0.113.9' }))).toBeNull();
  });

  it('com 1 proxy, usa o IP que o proxy acrescentou (último da lista), não o que o cliente enviou', () => {
    withEnv({ TRUST_PROXY_HOPS: '1' });
    expect(getClientIp(req({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9' }))).toBe('203.0.113.9');
    expect(getClientIp(req({ 'x-forwarded-for': '203.0.113.9' }))).toBe('203.0.113.9');
  });

  it('com 2 proxies, conta a partir da direita', () => {
    withEnv({ TRUST_PROXY_HOPS: '2' });
    expect(getClientIp(req({ 'x-forwarded-for': '9.9.9.9, 198.51.100.7, 10.0.0.2' }))).toBe('198.51.100.7');
  });

  it('valores que não são IP são descartados', () => {
    withEnv({ TRUST_PROXY_HOPS: '1' });
    expect(getClientIp(req({ 'x-forwarded-for': '<script>alert(1)</script>' }))).toBeNull();
    expect(getClientIp(req({}))).toBeNull();
  });

  it('TRUST_PROXY=true continua valendo como 1 proxy', () => {
    withEnv({ TRUST_PROXY_HOPS: undefined, TRUST_PROXY: 'true' });
    expect(getEnv().trustedProxyHops).toBe(1);
  });
});

describe('limites de requisição', () => {
  it('sem IP conhecido, pessoas diferentes NÃO dividem um limite apertado (antes: balde "local" global)', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(() => enforceClientRateLimit('quiz-start', null, { perIp: 1, global: 1000, windowMs: 60_000 })).not.toThrow();
    }
  });

  it('o limite por IP vale quando o IP é conhecido e o global continua protegendo o servidor', () => {
    enforceClientRateLimit('a', '203.0.113.9', { perIp: 1, windowMs: 60_000 });
    expect(() => enforceClientRateLimit('a', '203.0.113.9', { perIp: 1, windowMs: 60_000 })).toThrow(HttpError);
    expect(() => enforceClientRateLimit('a', '203.0.113.10', { perIp: 1, windowMs: 60_000 })).not.toThrow();

    for (let i = 0; i < 3; i += 1) enforceClientRateLimit('b', null, { global: 3, windowMs: 60_000 });
    expect(() => enforceClientRateLimit('b', null, { global: 3, windowMs: 60_000 })).toThrow(HttpError);
  });

  it('a memória do limitador tem teto, mesmo com chaves sempre diferentes', () => {
    for (let i = 0; i < MAX_BUCKETS + 500; i += 1) enforceRateLimit(`chave-unica-${i}`, 5, 60_000);
    expect(rateLimitBucketCount()).toBeLessThanOrEqual(MAX_BUCKETS);
  });
});

describe('corpo das requisições', () => {
  it('interrompe a leitura de corpo em partes (sem Content-Length) ao passar do limite', async () => {
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= 5 * 1024 * 1024) return controller.close();
        sent += 16 * 1024;
        controller.enqueue(new Uint8Array(16 * 1024));
      },
    });
    const request = new Request(`${ORIGIN}/api/teste`, {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });
    await expect(readBodyText(request, 64 * 1024)).rejects.toMatchObject({ status: 413 });
    expect(sent).toBeLessThan(5 * 1024 * 1024); // parou cedo, sem ler tudo para a memória
  });
});

describe('provedores de demonstração em produção', () => {
  it('a aplicação se recusa a iniciar com pagamento simulado sem confirmação explícita', () => {
    withEnv({ NODE_ENV: 'production' });
    expect(() => getEnv()).toThrow(/ALLOW_DEMO_PROVIDERS/);
    withEnv({ NODE_ENV: 'production', ALLOW_DEMO_PROVIDERS: 'true' });
    expect(getEnv().NODE_ENV).toBe('production');
  });

  it('simulador de pagamento nunca com provedor real', () => {
    withEnv({ NODE_ENV: 'production', PAYMENT_PROVIDER: 'provedor-real', ALLOW_DEMO_PROVIDERS: 'true' });
    expect(() => getEnv()).toThrow(/PAYMENT_SIMULATOR_ENABLED/);
  });
});

describe('cookies', () => {
  it('"remover deste navegador" expira o cookie com os mesmos atributos (obrigatório para __Host- em produção)', async () => {
    withEnv({ NODE_ENV: 'production', ALLOW_DEMO_PROVIDERS: 'true' });
    const response = await forgetRoute(
      new NextRequest(`${ORIGIN}/api/quiz/session/forget`, {
        method: 'POST',
        headers: { origin: ORIGIN, 'content-type': 'application/json' },
        body: '{}',
      }),
      undefined as never,
    );
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/^__Host-rq_quiz=;/);
    expect(setCookie).toMatch(/Path=\//);
    expect(setCookie).toMatch(/Secure/);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/Max-Age=0/);
  });
});

describe('identificadores', () => {
  it('condições e pesos recusam chaves especiais como __proto__', () => {
    expect(conditionSchema.safeParse({ answer: { questionId: '__proto__', op: 'answered' } }).success).toBe(false);
    expect(conditionSchema.safeParse({ answer: { questionId: 'q_status', op: 'answered' } }).success).toBe(true);

    const question = (weights: unknown) => ({
      stageId: 'stg_perfil',
      text: 'Pergunta de teste',
      helpText: null,
      type: 'single',
      required: true,
      maxSelections: null,
      scaleMinLabel: null,
      scaleMaxLabel: null,
      position: 0,
      active: true,
      condition: null,
      options: [
        { label: 'A', weights },
        { label: 'B', weights: {} },
      ],
    });
    // O zod descarta a chave "__proto__" de registros: nada de poluição de protótipo.
    const parsed = questionInputSchema.parse(question(JSON.parse('{"__proto__": 3, "cat_comunicacao": 2}')));
    const weights = parsed.options[0]!.weights;
    expect(Object.keys(weights)).toEqual(['cat_comunicacao']);
    expect(Object.getPrototypeOf(weights)).toBe(Object.prototype);
    expect(questionInputSchema.safeParse(question({ 'id com espaço': 3 })).success).toBe(false);
  });
});
