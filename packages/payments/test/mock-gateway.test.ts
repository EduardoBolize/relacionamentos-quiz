import { describe, expect, it } from 'vitest';
import {
  MOCK_PIX_GUI,
  MOCK_SIGNATURE_HEADER,
  MockPaymentGateway,
  PaymentError,
  WebhookSignatureError,
  buildMockBoleto,
  crc16ccitt,
  createPaymentGateway,
  dueDateFactor,
  encodeMockCardToken,
  signWebhookPayload,
  verifyWebhookSignature,
} from '../src';

const SECRET = 'segredo-de-teste-com-32-caracteres!';
const fixedNow = new Date('2026-09-25T12:00:00Z');
const gateway = new MockPaymentGateway({ webhookSecret: SECRET, now: () => fixedNow });
const customer = { name: 'Maria Silva', email: 'maria@example.com' };
const base = { orderId: 'ord_1', amountCents: 4233, description: 'Módulos', customer };

describe('gateway simulado — Pix', () => {
  it('cria cobrança pendente com QR Code e código copia e cola', async () => {
    const charge = await gateway.createCharge({ ...base, method: 'pix', expiresInMinutes: 30 });
    expect(charge.status).toBe('pending');
    expect(charge.pix?.qrCodeDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(charge.pix?.expiresAt).toBe('2026-09-25T12:30:00.000Z');
    expect(charge.pix?.copyPasteCode).toContain('540542.33');
  });

  it('usa um arranjo fictício (não pagável) e CRC válido', async () => {
    const charge = await gateway.createCharge({ ...base, method: 'pix' });
    const code = charge.pix!.copyPasteCode;
    expect(code).toContain(MOCK_PIX_GUI);
    expect(code).not.toContain('br.gov.bcb.pix');
    expect(crc16ccitt(code.slice(0, -4))).toBe(code.slice(-4));
  });

  it('calcula o CRC16/CCITT-FALSE corretamente', () => {
    expect(crc16ccitt('123456789')).toBe('29B1');
  });
});

describe('gateway simulado — boleto', () => {
  it('exige CPF válido', async () => {
    await expect(gateway.createCharge({ ...base, method: 'boleto' })).rejects.toBeInstanceOf(PaymentError);
    await expect(
      gateway.createCharge({ ...base, method: 'boleto', customer: { ...customer, document: '11111111111' } }),
    ).rejects.toMatchObject({ code: 'invalid_document' });
  });

  it('gera linha digitável e código de barras no layout FEBRABAN', async () => {
    const charge = await gateway.createCharge({
      ...base,
      method: 'boleto',
      dueInDays: 3,
      customer: { ...customer, document: '52998224725' },
    });
    expect(charge.status).toBe('pending');
    expect(charge.boleto?.dueDate).toBe('2026-09-28');
    expect(charge.boleto?.barcode).toMatch(/^000\d{41}$/);
    expect(charge.boleto?.digitableLine.replace(/\D/g, '')).toHaveLength(47);
  });

  it('calcula o fator de vencimento com o reinício de 2025', () => {
    expect(dueDateFactor(new Date('2025-02-21T00:00:00Z'))).toBe('9999');
    expect(dueDateFactor(new Date('2025-02-22T00:00:00Z'))).toBe('1000');
    const boleto = buildMockBoleto({ amountCents: 100, dueDate: new Date('2025-02-22T00:00:00Z'), seed: 'x' });
    expect(boleto.digitableLine.endsWith('10000000000100')).toBe(true);
  });
});

describe('gateway simulado — cartão', () => {
  const token = (outcome: 'approved' | 'declined' | 'insufficient_funds' | 'not_test_card') =>
    encodeMockCardToken({ outcome, brand: 'visa', last4: '1111' }, '0123456789abcdef');

  it('aprova na hora com cartão de teste aprovado', async () => {
    const charge = await gateway.createCharge({ ...base, method: 'card', cardToken: token('approved'), installments: 3 });
    expect(charge.status).toBe('paid');
    expect(charge.card).toMatchObject({ brand: 'visa', last4: '1111', installments: 3 });
    expect(charge.card?.authorizationCode).toMatch(/^\d{6}$/);
  });

  it('recusa conforme o cartão de teste', async () => {
    const declined = await gateway.createCharge({ ...base, method: 'card', cardToken: token('declined') });
    expect(declined).toMatchObject({ status: 'failed' });
    expect(declined.failureReason).toMatch(/recusado/i);
    const notTest = await gateway.createCharge({ ...base, method: 'card', cardToken: token('not_test_card') });
    expect(notTest.failureReason).toMatch(/cartões de teste/);
  });

  it('rejeita token inválido e parcelas fora do limite', async () => {
    await expect(gateway.createCharge({ ...base, method: 'card', cardToken: 'x' })).rejects.toMatchObject({
      code: 'invalid_card_token',
    });
    await expect(
      gateway.createCharge({ ...base, method: 'card', cardToken: token('approved'), installments: 13 }),
    ).rejects.toMatchObject({ code: 'invalid_installments' });
  });

  it('rejeita valores inválidos', async () => {
    await expect(gateway.createCharge({ ...base, method: 'pix', amountCents: 0 })).rejects.toMatchObject({
      code: 'invalid_amount',
    });
  });
});

describe('webhooks', () => {
  const body = JSON.stringify({ hello: 'world' });
  const nowSeconds = Math.floor(fixedNow.getTime() / 1000);

  it('aceita assinatura válida', () => {
    const header = signWebhookPayload(SECRET, body, nowSeconds);
    expect(() => verifyWebhookSignature(SECRET, header, body, { nowSeconds })).not.toThrow();
  });

  it('rejeita corpo alterado, segredo errado, cabeçalho ausente/malformado e replay antigo', () => {
    const header = signWebhookPayload(SECRET, body, nowSeconds);
    const reason = (fn: () => void) => {
      try {
        fn();
      } catch (error) {
        expect(error).toBeInstanceOf(WebhookSignatureError);
        return (error as WebhookSignatureError).reason;
      }
      return 'não lançou';
    };
    expect(reason(() => verifyWebhookSignature(SECRET, header, `${body} `, { nowSeconds }))).toBe('signature_mismatch');
    expect(reason(() => verifyWebhookSignature('outro-segredo-qualquer', header, body, { nowSeconds }))).toBe('signature_mismatch');
    expect(reason(() => verifyWebhookSignature(SECRET, null, body, { nowSeconds }))).toBe('missing_header');
    expect(reason(() => verifyWebhookSignature(SECRET, 't=abc,v1=zz', body, { nowSeconds }))).toBe('malformed_header');
    expect(reason(() => verifyWebhookSignature(SECRET, header, body, { nowSeconds: nowSeconds + 3600 }))).toBe(
      'timestamp_out_of_range',
    );
  });

  it('o gateway interpreta um evento assinado por ele mesmo', async () => {
    const { body: eventBody, headers, event } = gateway.buildSignedEvent({
      type: 'charge.paid',
      chargeId: 'mock_ch_1',
      orderId: 'ord_1',
    });
    await expect(gateway.parseWebhook(eventBody, headers)).resolves.toEqual(event);
  });

  it('o gateway rejeita eventos sem assinatura ou de tipo desconhecido', async () => {
    const { body: eventBody } = gateway.buildSignedEvent({ type: 'charge.paid', chargeId: 'c', orderId: 'o' });
    await expect(gateway.parseWebhook(eventBody, new Headers())).rejects.toBeInstanceOf(WebhookSignatureError);

    const forged = JSON.stringify({ id: 'e', type: 'charge.stolen', chargeId: 'c', orderId: 'o', occurredAt: 'x' });
    const headers = new Headers({
      [MOCK_SIGNATURE_HEADER]: signWebhookPayload(SECRET, forged, Math.floor(fixedNow.getTime() / 1000)),
    });
    await expect(gateway.parseWebhook(forged, headers)).rejects.toBeInstanceOf(PaymentError);
  });
});

describe('fábrica de gateways', () => {
  it('cria o gateway simulado e recusa provedores não implementados', () => {
    expect(createPaymentGateway({ provider: 'mock', webhookSecret: SECRET }).name).toBe('mock');
    expect(() => createPaymentGateway({ provider: 'banco-x', webhookSecret: SECRET })).toThrow(/não implementado/);
  });

  it('exige um segredo de webhook forte', () => {
    expect(() => new MockPaymentGateway({ webhookSecret: 'curto' })).toThrow();
  });
});
