import { MOCK_SIGNATURE_HEADER, MockPaymentGateway, WebhookSignatureError, signWebhookPayload } from '@relacionamentos/payments';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as webhookRoute } from '@/app/api/webhooks/payments/route';
import { db } from '@/server/db';
import { resetEnvCache } from '@/server/env';
import { getPaymentGateway, resetPaymentGateway } from '@/server/payments';
import { resetRateLimits } from '@/server/security/rate-limit';
import { createOrder, findOrderByToken, getOrderView, orderInputSchema } from '@/server/services/checkout-service';
import { handlePaymentWebhook, nextOrderStatus, simulatePayment } from '@/server/services/payment-webhook-service';
import { TEST_ENV } from './test-env';
import { uniqueEmail } from './helpers';

beforeEach(() => resetRateLimits());
afterEach(() => {
  process.env.PAYMENT_SIMULATOR_ENABLED = TEST_ENV.PAYMENT_SIMULATOR_ENABLED;
  resetEnvCache();
  resetPaymentGateway();
});

async function pendingPixOrder(email = uniqueEmail('pix')) {
  const input = orderInputSchema.parse({
    moduleSlugs: ['romance-e-surpresas'],
    customer: { name: 'Pessoa Pix', email },
    method: 'pix',
    acceptTerms: true,
  });
  const { orderPath } = await createOrder(input, { ip: 'ip-webhook', consent: false });
  const token = orderPath.replace('/pedido/', '');
  const order = await findOrderByToken(token);
  return { token, order: order!, email };
}

function signedEvent(type: 'charge.paid' | 'charge.failed' | 'charge.refunded', order: { id: string; gatewayChargeId: string | null }) {
  const gateway = getPaymentGateway() as MockPaymentGateway;
  return gateway.buildSignedEvent({ type, chargeId: order.gatewayChargeId!, orderId: order.id });
}

describe('webhooks de pagamento', () => {
  it('confirma o pagamento, libera o acesso e envia e-mail com novo link', async () => {
    const { token, order, email } = await pendingPixOrder();
    const { body, headers } = signedEvent('charge.paid', order);

    expect(await handlePaymentWebhook(body, headers)).toBe('processed');
    const view = await getOrderView(token);
    expect(view?.status).toBe('paid');
    expect(view?.pix).toBeNull(); // dados do Pix não são mais exibidos
    const mail = await db().emailOutbox.findFirst({ where: { to: email, subject: { contains: 'Pagamento confirmado' } } });
    expect(mail?.body).toMatch(/\/pedido\/[A-Za-z0-9_-]{43}/);
    expect(await db().orderAccessToken.count({ where: { orderId: order.id } })).toBe(2);
  });

  it('é idempotente: o mesmo evento entregue duas vezes é processado uma vez', async () => {
    const { order } = await pendingPixOrder();
    const { body, headers } = signedEvent('charge.paid', order);
    expect(await handlePaymentWebhook(body, headers)).toBe('processed');
    expect(await handlePaymentWebhook(body, headers)).toBe('duplicate');
    expect(await db().paymentEvent.count({ where: { orderId: order.id } })).toBe(1);
  });

  it('rejeita webhooks sem assinatura, com assinatura errada ou corpo adulterado', async () => {
    const { token, order } = await pendingPixOrder();
    const { body, headers } = signedEvent('charge.paid', order);

    await expect(handlePaymentWebhook(body, new Headers())).rejects.toBeInstanceOf(WebhookSignatureError);
    const tampered = body.replace('charge.paid', 'charge.refunded');
    await expect(handlePaymentWebhook(tampered, headers)).rejects.toBeInstanceOf(WebhookSignatureError);
    const wrongSecret = new Headers({
      [MOCK_SIGNATURE_HEADER]: signWebhookPayload('outro-segredo-qualquer-com-32-caracteres', body, Math.floor(Date.now() / 1000)),
    });
    await expect(handlePaymentWebhook(body, wrongSecret)).rejects.toBeInstanceOf(WebhookSignatureError);
    expect((await getOrderView(token))?.status).toBe('pending');
  });

  it('a rota de webhook responde 400 para assinatura inválida', async () => {
    const response = await webhookRoute(
      new NextRequest('http://localhost:3000/api/webhooks/payments', {
        method: 'POST',
        headers: { 'content-type': 'application/json', [MOCK_SIGNATURE_HEADER]: 't=1,v1=00' },
        body: JSON.stringify({ id: 'x' }),
      }),
      undefined as never,
    );
    expect(response.status).toBe(400);
  });

  it('não "desfaz" um pagamento com eventos fora de ordem, mas permite reembolso', async () => {
    const { token, order } = await pendingPixOrder();
    const paid = signedEvent('charge.paid', order);
    await handlePaymentWebhook(paid.body, paid.headers);
    const failed = signedEvent('charge.failed', order);
    expect(await handlePaymentWebhook(failed.body, failed.headers)).toBe('ignored');
    expect((await getOrderView(token))?.status).toBe('paid');

    const refunded = signedEvent('charge.refunded', order);
    expect(await handlePaymentWebhook(refunded.body, refunded.headers)).toBe('processed');
    expect((await getOrderView(token))?.status).toBe('refunded');
  });

  it('transições de status permitidas', () => {
    expect(nextOrderStatus('pending', 'charge.paid')).toBe('paid');
    expect(nextOrderStatus('paid', 'charge.paid')).toBeNull();
    expect(nextOrderStatus('paid', 'charge.expired')).toBeNull();
    expect(nextOrderStatus('expired', 'charge.paid')).toBe('paid');
    expect(nextOrderStatus('pending', 'charge.refunded')).toBeNull();
  });

  it('o simulador usa o mesmo caminho do webhook real e pode ser desligado', async () => {
    const { token } = await pendingPixOrder();
    expect(await simulatePayment(token, 'paid')).toBe('processed');
    expect((await getOrderView(token))?.status).toBe('paid');
    await expect(simulatePayment(token, 'paid')).rejects.toMatchObject({ status: 409 });

    process.env.PAYMENT_SIMULATOR_ENABLED = 'false';
    resetEnvCache();
    resetPaymentGateway();
    const other = await pendingPixOrder();
    await expect(simulatePayment(other.token, 'paid')).rejects.toMatchObject({ status: 404 });
    expect((await getOrderView(other.token))?.simulatorEnabled).toBe(false);
  });
});
