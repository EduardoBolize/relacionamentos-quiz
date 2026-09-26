import 'server-only';
import type { WebhookEvent, WebhookEventType } from '@relacionamentos/payments';
import { db } from '../db';
import { absoluteUrl, emailTemplates, sendEmailSafely } from '../email';
import { HttpError } from '../http';
import { getPaymentGateway, getSimulatorGateway } from '../payments';
import { generateToken, hashToken } from '../security/tokens';
import { findOrderByToken } from './checkout-service';

type OrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'canceled' | 'refunded';

/**
 * Transições permitidas. Eventos fora de ordem ou repetidos não "voltam" um pedido pago para
 * pendente, por exemplo.
 */
const TRANSITIONS: Record<WebhookEventType, { from: OrderStatus[]; to: OrderStatus }> = {
  'charge.paid': { from: ['pending', 'failed', 'expired'], to: 'paid' },
  'charge.failed': { from: ['pending'], to: 'failed' },
  'charge.expired': { from: ['pending'], to: 'expired' },
  'charge.canceled': { from: ['pending'], to: 'canceled' },
  'charge.refunded': { from: ['paid'], to: 'refunded' },
};

export function nextOrderStatus(current: string, type: WebhookEventType): OrderStatus | null {
  const transition = TRANSITIONS[type];
  return transition.from.includes(current as OrderStatus) ? transition.to : null;
}

export type WebhookOutcome = 'processed' | 'duplicate' | 'ignored';

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002';
}

/**
 * Processa um webhook do provedor de pagamentos:
 * 1. valida a assinatura (o gateway lança erro se for inválida);
 * 2. registra o id do evento — eventos repetidos são ignorados (idempotência);
 * 3. aplica a transição de status permitida.
 */
export async function handlePaymentWebhook(rawBody: string, headers: Headers): Promise<WebhookOutcome> {
  const event: WebhookEvent = await getPaymentGateway().parseWebhook(rawBody, headers);
  const order = await db().order.findUnique({ where: { gatewayChargeId: event.chargeId }, include: { items: true } });

  try {
    await db().paymentEvent.create({
      data: { id: event.id, orderId: order?.id ?? null, type: event.type, payloadJson: rawBody.slice(0, 10_000) },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return 'duplicate';
    throw error;
  }

  if (!order || order.id !== event.orderId) return 'ignored';
  const next = nextOrderStatus(order.status, event.type);
  if (!next) return 'ignored';

  const updated = await db().order.updateMany({
    where: { id: order.id, status: order.status },
    data: {
      status: next,
      ...(next === 'paid' ? { paidAt: new Date(), failureReason: null } : {}),
      ...(event.reason && next !== 'paid' ? { failureReason: event.reason.slice(0, 300) } : {}),
    },
  });
  if (updated.count === 0) return 'ignored';

  if (next === 'paid') {
    // Novo link de acesso para o e-mail de confirmação (o link anterior continua válido).
    const token = generateToken();
    await db().orderAccessToken.create({ data: { orderId: order.id, tokenHash: hashToken(token) } });
    await sendEmailSafely({
      to: order.customerEmail,
      ...emailTemplates.orderPaid(absoluteUrl(`/pedido/${token}`), order.items.map((item) => item.title)),
    });
    // Sem evento de analytics aqui: webhooks não carregam o consentimento da pessoa. As métricas de
    // vendas do painel vêm da própria tabela de pedidos.
  }
  return 'processed';
}

/**
 * SOMENTE DESENVOLVIMENTO: simula a confirmação/recusa/expiração de um pagamento pendente,
 * passando pelo MESMO caminho de um webhook real (assinatura + idempotência + transição).
 */
export async function simulatePayment(orderToken: string, outcome: 'paid' | 'failed' | 'expired'): Promise<WebhookOutcome> {
  const gateway = getSimulatorGateway();
  if (!gateway) throw new HttpError(404, 'not_found', 'Recurso não encontrado.');

  const order = await findOrderByToken(orderToken);
  if (!order || !order.gatewayChargeId) throw new HttpError(404, 'not_found', 'Pedido não encontrado.');
  if (order.status !== 'pending') throw new HttpError(409, 'not_pending', 'Este pedido não está aguardando pagamento.');

  const { body, headers } = gateway.buildSignedEvent({
    type: outcome === 'paid' ? 'charge.paid' : outcome === 'failed' ? 'charge.failed' : 'charge.expired',
    chargeId: order.gatewayChargeId,
    orderId: order.id,
    ...(outcome === 'failed' ? { reason: 'Pagamento recusado (simulação).' } : {}),
  });
  return handlePaymentWebhook(body, headers);
}
