import { encodeMockCardToken } from '@relacionamentos/payments';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/server/db';
import { resetRateLimits } from '@/server/security/rate-limit';
import {
  buildQuote,
  createOrder,
  getOrderView,
  getPurchasedModule,
  orderInputSchema,
  type OrderInput,
} from '@/server/services/checkout-service';
import { uniqueEmail } from './helpers';

beforeEach(() => resetRateLimits());

const cardToken = (outcome: 'approved' | 'declined' | 'insufficient_funds' | 'not_test_card') =>
  encodeMockCardToken({ outcome, brand: 'visa', last4: '1111' }, 'abcdef0123456789');

function orderInput(overrides: Partial<OrderInput> = {}): OrderInput {
  return orderInputSchema.parse({
    moduleSlugs: ['conversas-que-aproximam'],
    customer: { name: 'Pessoa de Teste', email: uniqueEmail('compra') },
    method: 'pix',
    acceptTerms: true,
    ...overrides,
  });
}

const context = { ip: 'ip-checkout', consent: false };
const tokenFrom = (orderPath: string) => orderPath.replace('/pedido/', '');

describe('checkout — preço calculado no servidor', () => {
  it('usa os preços do banco: R$ 15 por módulo e R$ 120 no curso completo, em até 6x', async () => {
    const { quote } = await buildQuote(['conversas-que-aproximam', 'romance-e-surpresas']);
    expect(quote).toMatchObject({ subtotalCents: 3000, discountPercent: 0, discountCents: 0, totalCents: 3000 });
    expect(quote.installmentOptions.map((o) => o.count)).toEqual([1, 2, 3]); // parcela mínima de R$ 10

    const slugs = (await db().bookModule.findMany({ where: { active: true }, select: { slug: true } })).map((m) => m.slug);
    const { quote: full } = await buildQuote(slugs);
    expect(full).toMatchObject({ subtotalCents: 12_000, totalCents: 12_000 });
    expect(full.installmentOptions.at(-1)).toEqual({ count: 6, amountCents: 2000 });
  });

  it('aplica o desconto de combo quando ele é ativado no admin', async () => {
    const original = await db().setting.findUniqueOrThrow({ where: { key: 'pricing' } });
    await db().setting.update({
      where: { key: 'pricing' },
      data: { value: JSON.stringify({ ...JSON.parse(original.value), comboDiscountPercent: 15 }) },
    });
    try {
      const { quote } = await buildQuote(['conversas-que-aproximam', 'romance-e-surpresas']);
      expect(quote).toMatchObject({ subtotalCents: 3000, discountPercent: 15, discountCents: 450, totalCents: 2550 });
    } finally {
      await db().setting.update({ where: { key: 'pricing' }, data: { value: original.value } });
    }
  });

  it('não aceita preço, total ou campos extras vindos do navegador', () => {
    const parsed = orderInputSchema.safeParse({
      moduleSlugs: ['conversas-que-aproximam'],
      customer: { name: 'Pessoa', email: 'a@b.com' },
      method: 'pix',
      acceptTerms: true,
      totalCents: 1,
    });
    expect(parsed.success).toBe(false);
  });

  it('exige aceite dos termos, CPF válido no boleto e token no cartão', () => {
    expect(orderInputSchema.safeParse({ ...orderInput(), acceptTerms: false }).success).toBe(false);
    expect(orderInputSchema.safeParse({ ...orderInput(), method: 'boleto' }).success).toBe(false);
    expect(
      orderInputSchema.safeParse({ ...orderInput(), method: 'boleto', customer: { name: 'Pessoa', email: 'a@b.com', document: '111.111.111-11' } }).success,
    ).toBe(false);
    expect(orderInputSchema.safeParse({ ...orderInput(), method: 'card' }).success).toBe(false);
  });

  it('rejeita módulos inexistentes ou inativos', async () => {
    await expect(buildQuote(['modulo-que-nao-existe'])).rejects.toMatchObject({ status: 422 });
    await db().bookModule.update({ where: { id: 'mod_compromisso' }, data: { active: false } });
    try {
      await expect(buildQuote(['amor-que-dura'])).rejects.toMatchObject({ status: 422 });
    } finally {
      await db().bookModule.update({ where: { id: 'mod_compromisso' }, data: { active: true } });
    }
  });
});

describe('checkout — métodos de pagamento', () => {
  it('Pix: pedido pendente com QR Code, código copia e cola e validade', async () => {
    const { orderPath } = await createOrder(orderInput(), context);
    const view = await getOrderView(tokenFrom(orderPath));
    expect(view).toMatchObject({ status: 'pending', method: 'pix', totalCents: 1500 });
    expect(view?.pix?.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(view?.pix?.copyPasteCode).toContain('br.com.exemplo.simulacao');
    expect(view?.simulatorEnabled).toBe(true);
  });

  it('boleto: pedido pendente com linha digitável; o CPF não é armazenado', async () => {
    const email = uniqueEmail('boleto');
    const { orderPath } = await createOrder(
      orderInput({ method: 'boleto', customer: { name: 'Pessoa Boleto', email, document: '529.982.247-25' } }),
      context,
    );
    const view = await getOrderView(tokenFrom(orderPath));
    expect(view?.boleto?.digitableLine.replace(/\D/g, '')).toHaveLength(47);
    const stored = await db().order.findFirstOrThrow({ where: { customerEmail: email } });
    expect(JSON.stringify(stored)).not.toContain('52998224725');
    expect(JSON.stringify(stored)).not.toContain('529.982.247-25');
  });

  it('cartão aprovado: pago na hora, com parcelas, sem número do cartão salvo', async () => {
    const email = uniqueEmail('cartao');
    const { orderPath } = await createOrder(
      orderInput({
        moduleSlugs: ['conversas-que-aproximam', 'romance-e-surpresas'],
        method: 'card',
        cardToken: cardToken('approved'),
        installments: 3,
        customer: { name: 'Pessoa Cartão', email },
      }),
      context,
    );
    const view = await getOrderView(tokenFrom(orderPath));
    expect(view).toMatchObject({ status: 'paid', installments: 3, card: { brand: 'visa', last4: '1111', installments: 3 } });
    const stored = await db().order.findFirstOrThrow({ where: { customerEmail: email } });
    expect(stored.paymentDataJson).not.toMatch(/4111111111111111|cvv/i);
    expect(await db().emailOutbox.count({ where: { to: email, subject: { contains: 'Pagamento confirmado' } } })).toBe(1);
  });

  it('cartão recusado / cartão real na simulação: pedido falha com motivo', async () => {
    for (const outcome of ['declined', 'insufficient_funds', 'not_test_card'] as const) {
      const { orderPath } = await createOrder(orderInput({ method: 'card', cardToken: cardToken(outcome) }), context);
      const view = await getOrderView(tokenFrom(orderPath));
      expect(view?.status).toBe('failed');
      expect(view?.failureReason).toBeTruthy();
    }
  });

  it('rejeita parcelamento acima do permitido para o valor', async () => {
    await expect(
      createOrder(orderInput({ method: 'card', cardToken: cardToken('approved'), installments: 12 }), context),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('limita a criação de pedidos por IP', async () => {
    for (let i = 0; i < 10; i += 1) await createOrder(orderInput(), { ...context, ip: 'ip-abuso' });
    await expect(createOrder(orderInput(), { ...context, ip: 'ip-abuso' })).rejects.toMatchObject({ status: 429 });
  });
});

describe('checkout — acesso ao conteúdo', () => {
  it('aulas e texto completo só para pedido pago e apenas dos módulos comprados', async () => {
    const pending = await createOrder(orderInput(), context);
    expect(await getPurchasedModule(tokenFrom(pending.orderPath), 'conversas-que-aproximam')).toBeNull();

    const paid = await createOrder(orderInput({ method: 'card', cardToken: cardToken('approved') }), context);
    const content = await getPurchasedModule(tokenFrom(paid.orderPath), 'conversas-que-aproximam');
    expect(content?.content).toContain('Banco de perguntas leves');
    expect(content?.videos.map((video) => video.title)).toEqual([
      'Assunto que não acaba',
      'Ouvir para entender, não para vencer',
      'Falar de sentimentos sem parecer chata',
    ]);
    expect(await getPurchasedModule(tokenFrom(paid.orderPath), 'romance-e-surpresas')).toBeNull();
    expect(await getPurchasedModule('token-invalido', 'conversas-que-aproximam')).toBeNull();
  });

  it('pedidos guardam uma cópia do preço: mudar o preço depois não altera o pedido', async () => {
    const { orderPath } = await createOrder(orderInput(), context);
    await db().bookModule.update({ where: { id: 'mod_conversas' }, data: { priceCents: 9990 } });
    try {
      const view = await getOrderView(tokenFrom(orderPath));
      expect(view?.totalCents).toBe(1500);
      expect(view?.items[0]?.priceCents).toBe(1500);
    } finally {
      await db().bookModule.update({ where: { id: 'mod_conversas' }, data: { priceCents: 1500 } });
    }
  });
});
