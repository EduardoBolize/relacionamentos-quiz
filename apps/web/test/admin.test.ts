import { createAdminUser } from '@relacionamentos/db';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getAdminFromToken, loginAdmin, logoutAdmin, requireAdminApi, type AdminContext } from '@/server/auth/admin-auth';
import { db } from '@/server/db';
import { getEngine, invalidateQuizDefinition } from '@/server/definition';
import { resetRateLimits } from '@/server/security/rate-limit';
import { getObjectionAnswers, getOfferInfo, moduleCheckoutHref } from '@/server/offer';
import {
  changeOwnPassword,
  deleteModule,
  saveModule,
  saveQuestion,
  saveRule,
  updatePrices,
  updateSettings,
} from '@/server/services/admin-content';
import { buildQuote, createOrder, orderInputSchema } from '@/server/services/checkout-service';
import { ORIGIN, uniqueEmail } from './helpers';

const PASSWORD = 'senha-de-teste-bem-longa-123';

async function newAdmin() {
  const email = uniqueEmail('admin');
  // custo menor do scrypt só nos testes (os parâmetros ficam gravados junto do hash)
  await createAdminUser(db(), { email, name: 'Admin Teste', password: PASSWORD }, { logN: 10 });
  return email;
}

async function loggedIn(): Promise<{ admin: AdminContext; token: string; email: string }> {
  const email = await newAdmin();
  const result = await loginAdmin({ email, password: PASSWORD, ip: 'ip-admin', userAgent: 'vitest' });
  if (!result.ok) throw new Error('login falhou');
  return { admin: result.admin, token: result.token, email };
}

function apiRequest(method: string, token: string | null, headers: Record<string, string> = {}) {
  return new Request('http://localhost:3000/api/admin/qualquer', {
    method,
    headers: { ...(token ? { cookie: `rq_admin=${token}` } : {}), ...headers },
  });
}

beforeEach(() => {
  resetRateLimits();
  invalidateQuizDefinition();
});

describe('autenticação do painel', () => {
  it('login com a senha correta cria uma sessão válida', async () => {
    const { token, admin } = await loggedIn();
    expect((await getAdminFromToken(token))?.id).toBe(admin.id);
    const session = await db().adminSession.findFirstOrThrow({ where: { adminId: admin.id } });
    expect(session.tokenHash).not.toBe(token);
  });

  it('senha errada e e-mail inexistente recebem a mesma resposta', async () => {
    const email = await newAdmin();
    expect(await loginAdmin({ email, password: 'errada-errada-errada', ip: 'ip', userAgent: null })).toEqual({ ok: false, reason: 'invalid' });
    expect(await loginAdmin({ email: uniqueEmail('ninguem'), password: 'qualquer-coisa-123', ip: 'ip', userAgent: null })).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('bloqueia a conta por 15 minutos após 5 senhas erradas', async () => {
    const email = await newAdmin();
    for (let i = 0; i < 4; i += 1) {
      expect((await loginAdmin({ email, password: `errada-${i}-xxxxxx`, ip: `ip-${i}`, userAgent: null })).ok).toBe(false);
    }
    expect(await loginAdmin({ email, password: 'errada-final-xxxx', ip: 'ip-5', userAgent: null })).toEqual({ ok: false, reason: 'throttled' });
    // mesmo com a senha certa, continua bloqueada
    expect(await loginAdmin({ email, password: PASSWORD, ip: 'ip-6', userAgent: null })).toEqual({ ok: false, reason: 'throttled' });
    const audit = await db().auditLog.count({ where: { action: { in: ['login_failed', 'login_blocked'] }, admin: { email } } });
    expect(audit).toBeGreaterThanOrEqual(6);
  });

  it('limita tentativas por IP', async () => {
    const email = await newAdmin();
    let last;
    for (let i = 0; i < 21; i += 1) last = await loginAdmin({ email: uniqueEmail('x'), password: 'errada-xxxxxxxx', ip: 'ip-forca-bruta', userAgent: null });
    expect(last).toEqual({ ok: false, reason: 'throttled' });
    expect((await loginAdmin({ email, password: PASSWORD, ip: 'ip-forca-bruta', userAgent: null })).ok).toBe(false);
  });

  it('sessão expirada, inativa ou encerrada não dá acesso', async () => {
    const { token, admin } = await loggedIn();
    await db().adminSession.updateMany({ where: { adminId: admin.id }, data: { lastSeenAt: new Date(Date.now() - 3 * 60 * 60 * 1000) } });
    expect(await getAdminFromToken(token)).toBeNull();

    const second = await loggedIn();
    await db().adminSession.updateMany({ where: { adminId: second.admin.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await getAdminFromToken(second.token)).toBeNull();

    const third = await loggedIn();
    await logoutAdmin(third.token);
    expect(await getAdminFromToken(third.token)).toBeNull();
  });

  it('rotas de API exigem sessão válida e, para escrita, a mesma origem (CSRF)', async () => {
    const { token } = await loggedIn();
    await expect(requireAdminApi(apiRequest('GET', null))).rejects.toMatchObject({ status: 401 });
    await expect(requireAdminApi(apiRequest('PUT', token))).rejects.toMatchObject({ status: 403 });
    await expect(requireAdminApi(apiRequest('PUT', token, { origin: 'https://site-malicioso.example' }))).rejects.toMatchObject({ status: 403 });
    await expect(requireAdminApi(apiRequest('PUT', token, { origin: ORIGIN, 'sec-fetch-site': 'cross-site' }))).rejects.toMatchObject({ status: 403 });
    await expect(requireAdminApi(apiRequest('PUT', token, { origin: ORIGIN }))).resolves.toMatchObject({ name: 'Admin Teste' });
    await expect(requireAdminApi(apiRequest('GET', token))).resolves.toBeTruthy();
  });
});

describe('gestão de conteúdo sem mexer no código', () => {
  let admin: AdminContext;
  beforeAll(async () => {
    admin = (await loggedIn()).admin;
  });

  it('uma nova pergunta com pesos passa a valer no quiz', async () => {
    const question = await saveQuestion(admin, null, {
      stageId: 'stg_compromisso',
      text: 'Vocês têm momentos separados com os próprios amigos?',
      helpText: null,
      type: 'single',
      required: true,
      maxSelections: null,
      scaleMinLabel: null,
      scaleMaxLabel: null,
      position: 99,
      active: true,
      condition: { answer: { questionId: 'q_momento', op: 'selected', optionIds: ['opt_momento_casada'] } },
      options: [
        { label: 'Sim, com frequência', weights: {} },
        { label: 'Quase nunca', weights: { cat_compromisso: 3 } },
      ],
    });
    try {
      const engine = await getEngine();
      const created = engine.definition.stages.find((s) => s.id === 'stg_compromisso')?.questions.find((q) => q.id === question.id);
      expect(created?.options[1]?.weights).toEqual({ cat_compromisso: 3 });
      expect(created?.condition).toEqual({ answer: { questionId: 'q_momento', op: 'selected', optionIds: ['opt_momento_casada'] } });
      expect(await db().auditLog.count({ where: { entityId: question.id, action: 'create' } })).toBe(1);
    } finally {
      await db().question.delete({ where: { id: question.id } });
      invalidateQuizDefinition();
    }
  });

  it('recusa pesos, condições e regras que apontam para itens inexistentes', async () => {
    const base = {
      stageId: 'stg_compromisso',
      text: 'Pergunta inválida para teste',
      helpText: null,
      type: 'single',
      required: true,
      maxSelections: null,
      scaleMinLabel: null,
      scaleMaxLabel: null,
      position: 50,
      active: true,
      condition: null,
      options: [
        { label: 'A', weights: {} },
        { label: 'B', weights: {} },
      ],
    };
    await expect(saveQuestion(admin, null, { ...base, options: [{ label: 'A', weights: { cat_fantasma: 2 } }, { label: 'B', weights: {} }] })).rejects.toMatchObject({ status: 422 });
    await expect(saveQuestion(admin, null, { ...base, condition: { answer: { questionId: 'q_fantasma', op: 'answered' } } })).rejects.toMatchObject({ status: 422 });
    await expect(saveQuestion(admin, null, { ...base, options: [{ label: 'Só uma', weights: {} }] })).rejects.toThrow();
    await expect(
      saveRule(admin, null, {
        name: 'Regra órfã',
        description: '',
        priority: 1,
        active: true,
        condition: { score: { categoryId: 'cat_comunicacao', op: 'gte', value: 10 } },
        effects: [{ type: 'recommendModule', moduleId: 'mod_fantasma' }],
      }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      saveRule(admin, null, { name: 'Sem efeito', description: '', priority: 1, active: true, condition: { all: [] }, effects: [] }),
    ).rejects.toThrow();
  });

  it('mudança de preço vale para novos orçamentos e fica na auditoria', async () => {
    await updatePrices(admin, { prices: [{ moduleId: 'mod_romance', priceCents: 1790 }] });
    try {
      const { quote } = await buildQuote(['romance-e-surpresas']);
      expect(quote.totalCents).toBe(1790);
      const log = await db().auditLog.findFirst({ where: { entity: 'prices' }, orderBy: { createdAt: 'desc' } });
      expect(log?.summary).toContain('Romance e Surpresas');
    } finally {
      await updatePrices(admin, { prices: [{ moduleId: 'mod_romance', priceCents: 1500 }] });
    }
  });

  it('módulo já vendido não pode ser excluído (só desativado)', async () => {
    const input = orderInputSchema.parse({
      moduleSlugs: ['amor-que-dura'],
      customer: { name: 'Compra Teste', email: uniqueEmail('venda') },
      method: 'pix',
      acceptTerms: true,
    });
    await createOrder(input, { ip: 'ip-venda', consent: false });
    await expect(deleteModule(admin, 'mod_compromisso')).rejects.toMatchObject({ status: 409 });
  });

  it('troca de senha exige a senha atual e uma senha forte', async () => {
    const { admin: me } = await loggedIn();
    await expect(changeOwnPassword(me, { currentPassword: 'errada', newPassword: 'nova-senha-bem-forte-1' })).rejects.toMatchObject({ status: 422 });
    await expect(changeOwnPassword(me, { currentPassword: PASSWORD, newPassword: 'curta' })).rejects.toMatchObject({ status: 422 });
    await expect(changeOwnPassword(me, { currentPassword: PASSWORD, newPassword: 'nova-senha-bem-forte-1' })).resolves.toBeUndefined();
  });
});

describe('aulas em vídeo, checkout externo e respostas às dúvidas', () => {
  let admin: AdminContext;
  beforeAll(async () => {
    admin = (await loggedIn()).admin;
  });

  const moduleInput = (overrides: Record<string, unknown> = {}) => ({
    slug: `modulo-teste-${Date.now()}`,
    title: 'Módulo de teste',
    subtitle: 'Módulo 9 · Teste',
    description: 'Um módulo criado só para os testes automatizados.',
    previewContent: '## Prévia\n- item',
    content: '## Conteúdo\nTexto completo do módulo de teste.',
    priceCents: 1500,
    coverEmoji: '🧪',
    position: 99,
    active: false,
    categoryIds: [],
    ...overrides,
  });
  const video = (title: string, overrides: Record<string, unknown> = {}) => ({
    title,
    durationSeconds: 60,
    script: `Roteiro da ${title}.`,
    keyPoints: 'Ponto 1\nPonto 2',
    videoUrl: null,
    isPreview: false,
    active: true,
    ...overrides,
  });

  it('cria, reordena e remove aulas; aceita só links de vídeo suportados', async () => {
    const created = await saveModule(admin, null, moduleInput({ videos: [video('Aula A'), video('Aula B'), video('Aula C')] }));
    try {
      const before = await db().moduleVideo.findMany({ where: { moduleId: created.id }, orderBy: { position: 'asc' } });
      expect(before.map((v) => v.title)).toEqual(['Aula A', 'Aula B', 'Aula C']);
      const [a, b] = before;

      await saveModule(
        admin,
        created.id,
        moduleInput({
          slug: created.slug,
          videos: [
            video('Aula B', { id: b!.id, videoUrl: 'https://youtu.be/dQw4w9WgXcQ', isPreview: true }),
            video('Aula A', { id: a!.id }),
            video('Aula D'),
          ],
        }),
      );
      const after = await db().moduleVideo.findMany({ where: { moduleId: created.id }, orderBy: { position: 'asc' } });
      expect(after.map((v) => v.title)).toEqual(['Aula B', 'Aula A', 'Aula D']);
      expect(after[0]).toMatchObject({ id: b!.id, videoUrl: 'https://youtu.be/dQw4w9WgXcQ', isPreview: true });
      expect(after[1]!.id).toBe(a!.id); // mantém o id (e o histórico) das aulas existentes

      for (const videoUrl of ['https://site-qualquer.example/video', 'javascript:alert(1)', 'http://youtu.be/dQw4w9WgXcQ']) {
        await expect(saveModule(admin, created.id, moduleInput({ slug: created.slug, videos: [video('X', { videoUrl })] }))).rejects.toThrow();
      }
      // sem a lista de aulas, as aulas atuais são mantidas
      await saveModule(admin, created.id, moduleInput({ slug: created.slug, title: 'Módulo de teste (editado)' }));
      expect(await db().moduleVideo.count({ where: { moduleId: created.id } })).toBe(3);
    } finally {
      await deleteModule(admin, created.id);
    }
    expect(await db().moduleVideo.count({ where: { moduleId: created.id } })).toBe(0); // aulas apagadas junto
  });

  it('checkout externo (ex.: Kiwify) só com https', async () => {
    const created = await saveModule(admin, null, moduleInput({ checkoutUrl: 'https://pay.kiwify.com.br/abc123' }));
    try {
      expect(moduleCheckoutHref(created)).toEqual({ href: 'https://pay.kiwify.com.br/abc123', external: true });
      for (const checkoutUrl of ['javascript:alert(1)', 'http://pay.kiwify.com.br/abc', 'https://usuario:senha@exemplo.com/x']) {
        await expect(saveModule(admin, created.id, moduleInput({ slug: created.slug, checkoutUrl }))).rejects.toThrow();
      }
      const cleared = await saveModule(admin, created.id, moduleInput({ slug: created.slug, checkoutUrl: '' }));
      expect(moduleCheckoutHref(cleared)).toEqual({ href: `/checkout?modulos=${created.slug}`, external: false });
    } finally {
      await deleteModule(admin, created.id);
    }
  });

  it('oferta do curso e respostas às dúvidas com os valores atuais', async () => {
    const [course, objections] = await Promise.all([
      db().setting.findUniqueOrThrow({ where: { key: 'course' } }),
      db().setting.findUniqueOrThrow({ where: { key: 'objections' } }),
    ]);
    try {
      const before = await getOfferInfo();
      expect(before).toMatchObject({ moduleCount: 8, courseTotalCents: 12_000, maxInstallments: 6, fullCourseExternal: false, guaranteeDays: 7 });
      const [preco] = await getObjectionAnswers(before, ['objecao_preco']);
      expect(preco?.answer).toMatch(/Cada módulo custa R\$\s15,00.*8 módulos saem por R\$\s120,00, em até 6x/);

      await updateSettings(admin, { course: { guaranteeDays: 30, fullCourseCheckoutUrl: 'https://pay.kiwify.com.br/curso-completo' } });
      const after = await getOfferInfo();
      expect(after).toMatchObject({ fullCourseHref: 'https://pay.kiwify.com.br/curso-completo', fullCourseExternal: true, guaranteeDays: 30 });
      const [garantia] = await getObjectionAnswers(after, ['objecao_garantia']);
      expect(garantia?.answer).toContain('em até 30 dias');

      await expect(updateSettings(admin, { course: { guaranteeDays: 7, fullCourseCheckoutUrl: 'javascript:alert(1)' } })).rejects.toThrow();
      const duplicated = [
        { flag: 'objecao_x', title: 'Dúvida', answer: 'Resposta suficientemente longa.' },
        { flag: 'objecao_x', title: 'Outra', answer: 'Outra resposta longa o bastante.' },
      ];
      await expect(updateSettings(admin, { objections: duplicated })).rejects.toThrow();
      await updateSettings(admin, { objections: [duplicated[0]] });
      expect(await getObjectionAnswers(after)).toEqual([duplicated[0]]);
    } finally {
      await db().setting.update({ where: { key: 'course' }, data: { value: course.value } });
      await db().setting.update({ where: { key: 'objections' }, data: { value: objections.value } });
    }
  });
});
