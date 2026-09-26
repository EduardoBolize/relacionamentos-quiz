import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { GET as getQuizSession, POST as startQuiz } from '@/app/api/quiz/session/route';
import { POST as answerRoute } from '@/app/api/quiz/session/answer/route';
import { POST as analyticsRoute } from '@/app/api/analytics/route';
import { extractHighlights, parseMarkdown } from '@/lib/markdown';
import { HttpError } from '@/server/http';
import { checkRateLimit, resetRateLimits } from '@/server/security/rate-limit';
import { assertSameOrigin, getClientIp, readJson } from '@/server/security/request';
import { generateToken, hashToken, isValidTokenFormat } from '@/server/security/tokens';
import { ORIGIN } from './helpers';

beforeEach(() => resetRateLimits());

const request = (headers: Record<string, string>, body?: string, method = 'POST') =>
  new Request('http://localhost:3000/api/teste', { method, headers, ...(body !== undefined ? { body } : {}) });

describe('proteção contra CSRF (verificação de origem)', () => {
  it('aceita a própria origem e recusa origens externas', () => {
    expect(() => assertSameOrigin(request({ origin: ORIGIN }))).not.toThrow();
    expect(() => assertSameOrigin(request({ referer: `${ORIGIN}/checkout` }))).not.toThrow();
    expect(() => assertSameOrigin(request({ origin: 'https://evil.example' }))).toThrow(HttpError);
    expect(() => assertSameOrigin(request({ referer: 'https://evil.example/pagina' }))).toThrow(HttpError);
    expect(() => assertSameOrigin(request({}))).toThrow(HttpError);
    expect(() => assertSameOrigin(request({ origin: ORIGIN, 'sec-fetch-site': 'cross-site' }))).toThrow(HttpError);
  });
});

describe('leitura segura de JSON', () => {
  const schema = z.object({ nome: z.string() }).strict();

  it('exige Content-Type JSON, limita o tamanho e valida o esquema', async () => {
    await expect(readJson(request({ 'content-type': 'text/plain' }, '{"nome":"a"}'), schema)).rejects.toMatchObject({ status: 415 });
    await expect(readJson(request({ 'content-type': 'application/json' }, 'x'.repeat(70_000)), schema)).rejects.toMatchObject({ status: 413 });
    await expect(readJson(request({ 'content-type': 'application/json' }, '{quebrado'), schema)).rejects.toMatchObject({ status: 400 });
    await expect(readJson(request({ 'content-type': 'application/json' }, '{"nome":"a","admin":true}'), schema)).rejects.toBeInstanceOf(z.ZodError);
    await expect(readJson(request({ 'content-type': 'application/json' }, '{"nome":"a"}'), schema)).resolves.toEqual({ nome: 'a' });
  });

  it('não confia em X-Forwarded-For sem TRUST_PROXY (evita burlar o limite de requisições)', () => {
    expect(getClientIp(request({ 'x-forwarded-for': '1.2.3.4' }))).toBe('local');
  });
});

describe('tokens e limites', () => {
  it('tokens têm 256 bits, formato validado e hash determinístico', () => {
    const token = generateToken();
    expect(isValidTokenFormat(token)).toBe(true);
    expect(isValidTokenFormat('abc')).toBe(false);
    expect(isValidTokenFormat(`${token}'; DROP TABLE`)).toBe(false);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(generateToken()).not.toBe(token);
  });

  it('limitador de requisições por janela', () => {
    const now = 1_000_000;
    expect(checkRateLimit('k', 2, 1000, now).allowed).toBe(true);
    expect(checkRateLimit('k', 2, 1000, now + 1).allowed).toBe(true);
    expect(checkRateLimit('k', 2, 1000, now + 2)).toMatchObject({ allowed: false, remaining: 0 });
    expect(checkRateLimit('k', 2, 1000, now + 1001).allowed).toBe(true);
  });
});

describe('markdown seguro (conteúdo editado no admin)', () => {
  it('HTML e scripts viram texto; não existem links nem atributos', () => {
    const blocks = parseMarkdown('<script>alert(1)</script>\n\n[clique](javascript:alert(1)) **negrito** <img src=x onerror=alert(1)>');
    const serialized = JSON.stringify(blocks);
    expect(blocks.every((block) => ['paragraph', 'heading', 'list', 'quote'].includes(block.type))).toBe(true);
    expect(serialized).toContain('<script>alert(1)</script>'); // texto literal, escapado pelo React na renderização
    expect(serialized).not.toContain('"href"');
    expect(serialized).not.toContain('"src"');
  });

  it('interpreta títulos, listas, citações e ênfase', () => {
    const blocks = parseMarkdown('## Título\n- item **forte**\n- *leve*\n\n> citação');
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'list', 'quote']);
    expect(extractHighlights('## x\n- um\n- dois\n- três', 2)).toEqual(['um', 'dois']);
  });
});

describe('rotas HTTP do quiz', () => {
  it('iniciar o quiz cria cookie HttpOnly/SameSite e o GET retoma a sessão', async () => {
    const response = await startQuiz(
      new NextRequest(`${ORIGIN}/api/quiz/session`, {
        method: 'POST',
        headers: { origin: ORIGIN, 'content-type': 'application/json' },
        body: '{}',
      }),
      undefined as never,
    );
    expect(response.status).toBe(201);
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/rq_quiz=[A-Za-z0-9_-]{43}/);
    expect(setCookie.toLowerCase()).toContain('httponly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    expect(response.headers.get('cache-control')).toBe('no-store');

    const cookie = setCookie.split(';')[0]!;
    const current = await getQuizSession(new NextRequest(`${ORIGIN}/api/quiz/session`, { headers: { cookie } }), undefined as never);
    expect(await current.json()).toMatchObject({ status: 'in_progress', step: { id: 'q_status' } });
  });

  it('sem cookie, o GET informa que não há sessão', async () => {
    const response = await getQuizSession(new NextRequest(`${ORIGIN}/api/quiz/session`), undefined as never);
    expect(await response.json()).toEqual({ status: 'none' });
  });

  it('recusa respostas de outra origem e sem sessão', async () => {
    const crossSite = await answerRoute(
      new NextRequest(`${ORIGIN}/api/quiz/session/answer`, {
        method: 'POST',
        headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
        body: JSON.stringify({ stepId: 'q_status', optionIds: ['opt_status_juntos'] }),
      }),
      undefined as never,
    );
    expect(crossSite.status).toBe(403);

    const noSession = await answerRoute(
      new NextRequest(`${ORIGIN}/api/quiz/session/answer`, {
        method: 'POST',
        headers: { origin: ORIGIN, 'content-type': 'application/json' },
        body: JSON.stringify({ stepId: 'q_status', optionIds: ['opt_status_juntos'] }),
      }),
      undefined as never,
    );
    expect(noSession.status).toBe(404);
  });

  it('analytics só aceita eventos de cliente do catálogo e respeita o consentimento', async () => {
    const send = (name: string, props: unknown, consent?: string) =>
      analyticsRoute(
        new NextRequest(`${ORIGIN}/api/analytics`, {
          method: 'POST',
          headers: { origin: ORIGIN, 'content-type': 'application/json', ...(consent ? { cookie: `rq_consent=${consent}` } : {}) },
          body: JSON.stringify({ name, props }),
        }),
        undefined as never,
      );
    expect((await send('payment_approved', { method: 'pix', totalCents: 1 }, 'analytics')).status).toBe(400);
    expect((await send('checkout_viewed', { moduleCount: 1, email: 'a@b.com' }, 'analytics')).status).toBe(400);
    expect((await send('checkout_viewed', { moduleCount: 1 })).status).toBe(204);
    expect((await send('checkout_viewed', { moduleCount: 1 }, 'analytics')).status).toBe(204);
  });
});
