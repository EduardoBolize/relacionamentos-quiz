import 'server-only';
import { normalizeEmail, type BookModule } from '@relacionamentos/db';
import {
  PaymentError,
  calculateQuote,
  formatBRL,
  isValidCpf,
  onlyDigits,
  type Charge,
} from '@relacionamentos/payments';
import { z } from 'zod';
import type { CatalogModuleDTO, OrderViewDTO, QuoteDTO } from '@/lib/dto';
import { trackEvent } from '../analytics';
import { db } from '../db';
import { absoluteUrl, emailTemplates, sendEmailSafely } from '../email';
import { HttpError } from '../http';
import { getPaymentGateway, isSimulatorEnabled } from '../payments';
import { enforceRateLimit } from '../security/rate-limit';
import { generateToken, hashToken, isValidTokenFormat } from '../security/tokens';
import { getPaymentSettings, getPricingSettings } from '../settings';
import { findSessionByToken } from './quiz-service';
import { emailSchema } from './result-service';

export const MAX_ITEMS = 20;
const slugSchema = z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/);

export const quoteInputSchema = z.object({ moduleSlugs: z.array(slugSchema).min(1).max(MAX_ITEMS) }).strict();

export const orderInputSchema = z
  .object({
    moduleSlugs: z.array(slugSchema).min(1, 'Escolha ao menos um módulo.').max(MAX_ITEMS),
    customer: z
      .object({
        name: z.string().trim().min(3, 'Informe seu nome completo.').max(120),
        email: emailSchema,
        document: z.string().trim().max(20).optional(),
      })
      .strict(),
    method: z.enum(['pix', 'boleto', 'card']),
    cardToken: z.string().max(200).optional(),
    installments: z.number().int().min(1).max(12).optional(),
    acceptTerms: z.literal(true, { message: 'É preciso aceitar os termos para continuar.' }),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.method === 'boleto' && !(value.customer.document && isValidCpf(value.customer.document))) {
      ctx.addIssue({ code: 'custom', path: ['customer', 'document'], message: 'Informe um CPF válido para gerar o boleto.' });
    }
    if (value.method === 'card' && !value.cardToken) {
      ctx.addIssue({ code: 'custom', path: ['cardToken'], message: 'Preencha os dados do cartão.' });
    }
  });

export type OrderInput = z.infer<typeof orderInputSchema>;

export const METHOD_LABELS = { pix: 'Pix', boleto: 'boleto', card: 'cartão de crédito' } as const;

export async function listCatalog(): Promise<CatalogModuleDTO[]> {
  const modules = await db().bookModule.findMany({ where: { active: true }, orderBy: [{ position: 'asc' }, { title: 'asc' }] });
  return modules.map((module) => ({
    id: module.id,
    slug: module.slug,
    title: module.title,
    subtitle: module.subtitle,
    description: module.description,
    priceCents: module.priceCents,
    coverEmoji: module.coverEmoji,
  }));
}

/** Orçamento calculado no servidor, com preços do banco (nunca do navegador). */
export async function buildQuote(moduleSlugs: string[]): Promise<{ quote: QuoteDTO; modules: BookModule[] }> {
  const unique = [...new Set(moduleSlugs)];
  const modules = await db().bookModule.findMany({
    where: { slug: { in: unique }, active: true },
    orderBy: [{ position: 'asc' }, { title: 'asc' }],
  });
  if (modules.length !== unique.length) {
    throw new HttpError(422, 'unknown_module', 'Algum módulo selecionado não está mais disponível.');
  }
  const quote = calculateQuote(
    modules.map((module) => ({ id: module.id, title: module.title, priceCents: module.priceCents })),
    await getPricingSettings(),
  );
  return {
    modules,
    quote: {
      items: modules.map((module) => ({ slug: module.slug, title: module.title, priceCents: module.priceCents })),
      subtotalCents: quote.subtotalCents,
      discountCents: quote.discountCents,
      discountPercent: quote.discountPercent,
      totalCents: quote.totalCents,
      installmentOptions: quote.installmentOptions,
    },
  };
}

export interface CreateOrderContext {
  ip: string;
  consent: boolean;
  sessionToken?: string;
}

export async function createOrder(input: OrderInput, context: CreateOrderContext): Promise<{ orderPath: string }> {
  enforceRateLimit(`order:${context.ip}`, 10, 10 * 60 * 1000);

  const { quote, modules } = await buildQuote(input.moduleSlugs);
  if (quote.totalCents <= 0) throw new HttpError(422, 'invalid_total', 'Valor do pedido inválido.');

  const installments = input.method === 'card' ? (input.installments ?? 1) : 1;
  if (!quote.installmentOptions.some((option) => option.count === installments)) {
    throw new HttpError(422, 'invalid_installments', 'Parcelamento indisponível para este valor.');
  }

  const gateway = getPaymentGateway();
  const paymentSettings = await getPaymentSettings();
  const session = context.sessionToken ? await findSessionByToken(context.sessionToken) : null;
  const accessToken = generateToken();
  const email = normalizeEmail(input.customer.email);

  const order = await db().order.create({
    data: {
      sessionId: session?.id ?? null,
      customerName: input.customer.name,
      customerEmail: email,
      status: 'pending',
      method: input.method,
      subtotalCents: quote.subtotalCents,
      discountCents: quote.discountCents,
      totalCents: quote.totalCents,
      installments,
      gateway: gateway.name,
      accessTokens: { create: { tokenHash: hashToken(accessToken) } },
      items: {
        create: modules.map((module) => ({ moduleId: module.id, title: module.title, priceCents: module.priceCents })),
      },
    },
  });

  let charge: Charge;
  try {
    charge = await gateway.createCharge({
      orderId: order.id,
      amountCents: quote.totalCents,
      description: `Entre Nós — ${modules.length} módulo(s)`,
      method: input.method,
      customer: {
        name: input.customer.name,
        email,
        ...(input.customer.document ? { document: onlyDigits(input.customer.document) } : {}),
      },
      installments,
      ...(input.cardToken ? { cardToken: input.cardToken } : {}),
      expiresInMinutes: paymentSettings.pixExpirationMinutes,
      dueInDays: paymentSettings.boletoDueDays,
    });
  } catch (error) {
    await db().order.update({
      where: { id: order.id },
      data: {
        status: 'failed',
        failureReason: error instanceof PaymentError ? error.message : 'Não foi possível criar a cobrança.',
      },
    });
    throw error;
  }

  // Apenas dados públicos do pagamento são guardados (nada de número de cartão, CVV ou CPF).
  const paymentData = charge.pix ? { pix: charge.pix } : charge.boleto ? { boleto: charge.boleto } : { card: charge.card };
  await db().order.update({
    where: { id: order.id },
    data: {
      gatewayChargeId: charge.id,
      status: charge.status,
      paymentDataJson: JSON.stringify(paymentData),
      paidAt: charge.status === 'paid' ? new Date() : null,
      failureReason: charge.failureReason ?? null,
      expiresAt: charge.pix
        ? new Date(charge.pix.expiresAt)
        : charge.boleto
          ? new Date(`${charge.boleto.dueDate}T23:59:59-03:00`)
          : null,
    },
  });

  await trackEvent(context.consent, 'order_created', { method: input.method, totalCents: quote.totalCents, moduleCount: modules.length }, session?.id);
  if (charge.status === 'paid') {
    await trackEvent(context.consent, 'payment_approved', { method: input.method, totalCents: quote.totalCents }, session?.id);
  } else if (charge.status === 'failed') {
    await trackEvent(context.consent, 'payment_failed', { method: input.method, reason: charge.failureReason?.slice(0, 120) }, session?.id);
  }

  const link = absoluteUrl(`/pedido/${accessToken}`);
  if (charge.status === 'paid') {
    await sendEmailSafely({ to: email, ...emailTemplates.orderPaid(link, modules.map((m) => m.title)) });
  } else if (charge.status === 'pending') {
    await sendEmailSafely({ to: email, ...emailTemplates.orderCreated(link, METHOD_LABELS[input.method]) });
  }

  return { orderPath: `/pedido/${accessToken}` };
}

export async function findOrderByToken(token: string) {
  if (!isValidTokenFormat(token)) return null;
  const access = await db().orderAccessToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { order: { include: { items: { include: { module: true } } } } },
  });
  if (!access || access.revokedAt) return null;
  if (!access.lastUsedAt || Date.now() - access.lastUsedAt.getTime() > 60_000) {
    await db().orderAccessToken.update({ where: { id: access.id }, data: { lastUsedAt: new Date() } });
  }
  return access.order;
}

const paymentDataSchema = z.object({
  pix: z.object({ copyPasteCode: z.string(), qrCodeDataUrl: z.string().startsWith('data:image/png;base64,'), expiresAt: z.string() }).optional(),
  boleto: z.object({ digitableLine: z.string(), barcode: z.string(), dueDate: z.string() }).optional(),
  card: z
    .object({ brand: z.string(), last4: z.string(), installments: z.number(), authorizationCode: z.string().optional() })
    .optional(),
});

export async function getOrderView(token: string): Promise<OrderViewDTO | null> {
  let order = await findOrderByToken(token);
  if (!order) return null;

  // Pix vencido: marca como expirado (com provedor real, o webhook de expiração também chega).
  if (order.status === 'pending' && order.method === 'pix' && order.expiresAt && order.expiresAt < new Date()) {
    await db().order.updateMany({ where: { id: order.id, status: 'pending' }, data: { status: 'expired' } });
    order = { ...order, status: 'expired' };
  }

  let paymentData: z.infer<typeof paymentDataSchema> = {};
  try {
    paymentData = paymentDataSchema.parse(JSON.parse(order.paymentDataJson ?? '{}'));
  } catch {
    paymentData = {};
  }
  const pending = order.status === 'pending';

  return {
    status: order.status as OrderViewDTO['status'],
    method: order.method as OrderViewDTO['method'],
    customerFirstName: order.customerName.split(/\s+/)[0] ?? '',
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    expiresAt: order.expiresAt?.toISOString() ?? null,
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    totalCents: order.totalCents,
    installments: order.installments,
    failureReason: order.failureReason,
    items: order.items.map((item) => ({
      slug: item.module.slug,
      title: item.title,
      priceCents: item.priceCents,
      coverEmoji: item.module.coverEmoji,
    })),
    pix: pending && paymentData.pix ? paymentData.pix : null,
    boleto: pending && paymentData.boleto ? paymentData.boleto : null,
    card: paymentData.card ?? null,
    simulatorEnabled: pending && isSimulatorEnabled(),
  };
}

/** Conteúdo completo de um módulo — somente para pedidos pagos que contêm o módulo. */
export async function getPurchasedModule(token: string, slug: string) {
  const order = await findOrderByToken(token);
  if (!order || order.status !== 'paid') return null;
  const item = order.items.find((entry) => entry.module.slug === slug);
  if (!item) return null;
  return { title: item.module.title, subtitle: item.module.subtitle, coverEmoji: item.module.coverEmoji, content: item.module.content };
}

export function describeTotal(quote: QuoteDTO): string {
  return quote.discountCents > 0
    ? `${formatBRL(quote.totalCents)} (com ${quote.discountPercent}% de desconto)`
    : formatBRL(quote.totalCents);
}
