import { randomBytes, randomInt } from 'node:crypto';
import QRCode from 'qrcode';
import { isValidCpf } from '../document';
import {
  PaymentError,
  WEBHOOK_EVENT_TYPES,
  type Charge,
  type CreateChargeInput,
  type PaymentGateway,
  type WebhookEvent,
  type WebhookEventType,
} from '../types';
import { signWebhookPayload, verifyWebhookSignature } from '../webhook';
import { buildMockBoleto } from './boleto';
import { CARD_FAILURE_MESSAGES, decodeMockCardToken } from './card-token';
import { buildMockPixPayload } from './pix';

export const MOCK_SIGNATURE_HEADER = 'x-mock-signature';

export interface MockGatewayOptions {
  webhookSecret: string;
  /** Relógio injetável (facilita testes). */
  now?: () => Date;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Gateway SIMULADO de pagamentos (Pix, boleto e cartão).
 *
 * - Pix e boleto nascem "pendentes" e são confirmados por webhook (disparado pelo simulador
 *   do ambiente de desenvolvimento), exatamente como acontece com provedores reais;
 * - cartão é aprovado/recusado na hora conforme o cartão de teste usado.
 *
 * Não guarda estado: tudo o que precisa ser lembrado fica no pedido, no banco da aplicação.
 */
export class MockPaymentGateway implements PaymentGateway {
  readonly name = 'mock';

  constructor(private readonly options: MockGatewayOptions) {
    if (!options.webhookSecret || options.webhookSecret.length < 16) {
      throw new Error('O segredo de webhook do gateway simulado deve ter ao menos 16 caracteres.');
    }
  }

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }

  async createCharge(input: CreateChargeInput): Promise<Charge> {
    if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
      throw new PaymentError('invalid_amount', 'Valor inválido para cobrança.');
    }
    if (!input.customer.name.trim() || !input.customer.email.includes('@')) {
      throw new PaymentError('invalid_customer', 'Dados do comprador incompletos.');
    }

    const now = this.now();
    const id = `mock_ch_${randomBytes(12).toString('hex')}`;
    const base = { id, method: input.method, amountCents: input.amountCents, createdAt: now.toISOString() };

    switch (input.method) {
      case 'pix': {
        const minutes = clamp(input.expiresInMinutes ?? 30, 5, 24 * 60);
        const copyPasteCode = buildMockPixPayload({ amountCents: input.amountCents, txid: id });
        const qrCodeDataUrl = await QRCode.toDataURL(copyPasteCode, {
          margin: 1,
          width: 280,
          errorCorrectionLevel: 'M',
        });
        return {
          ...base,
          status: 'pending',
          pix: {
            copyPasteCode,
            qrCodeDataUrl,
            expiresAt: new Date(now.getTime() + minutes * 60_000).toISOString(),
          },
        };
      }

      case 'boleto': {
        if (!input.customer.document || !isValidCpf(input.customer.document)) {
          throw new PaymentError('invalid_document', 'Informe um CPF válido para gerar o boleto.');
        }
        const days = clamp(input.dueInDays ?? 3, 1, 30);
        const dueDate = new Date(now.getTime() + days * 86_400_000);
        const boleto = buildMockBoleto({ amountCents: input.amountCents, dueDate, seed: id });
        return {
          ...base,
          status: 'pending',
          boleto: { ...boleto, dueDate: dueDate.toISOString().slice(0, 10) },
        };
      }

      case 'card': {
        const token = decodeMockCardToken(input.cardToken ?? '');
        if (!token) {
          throw new PaymentError('invalid_card_token', 'Não foi possível validar o cartão. Tente novamente.');
        }
        const installments = input.installments ?? 1;
        if (!Number.isInteger(installments) || installments < 1 || installments > 12) {
          throw new PaymentError('invalid_installments', 'Número de parcelas inválido.');
        }
        const card = { brand: token.brand, last4: token.last4, installments };
        if (token.outcome === 'approved') {
          return {
            ...base,
            status: 'paid',
            card: { ...card, authorizationCode: String(randomInt(100000, 1000000)) },
          };
        }
        return { ...base, status: 'failed', card, failureReason: CARD_FAILURE_MESSAGES[token.outcome] };
      }

      default:
        throw new PaymentError('unsupported_method', 'Forma de pagamento não suportada.');
    }
  }

  async parseWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent> {
    verifyWebhookSignature(this.options.webhookSecret, headers.get(MOCK_SIGNATURE_HEADER), rawBody, {
      nowSeconds: Math.floor(this.now().getTime() / 1000),
    });

    let data: unknown;
    try {
      data = JSON.parse(rawBody);
    } catch {
      throw new PaymentError('provider_error', 'Corpo do webhook inválido.');
    }
    return parseEvent(data);
  }

  /**
   * SOMENTE SIMULAÇÃO: monta um webhook assinado, como o provedor faria ao confirmar
   * (ou recusar/expirar) um pagamento.
   */
  buildSignedEvent(input: {
    type: WebhookEventType;
    chargeId: string;
    orderId: string;
    reason?: string;
  }): { body: string; headers: Headers; event: WebhookEvent } {
    const now = this.now();
    const event: WebhookEvent = {
      id: `mock_evt_${randomBytes(12).toString('hex')}`,
      type: input.type,
      chargeId: input.chargeId,
      orderId: input.orderId,
      occurredAt: now.toISOString(),
      ...(input.reason ? { reason: input.reason } : {}),
    };
    const body = JSON.stringify(event);
    const headers = new Headers({
      'content-type': 'application/json',
      [MOCK_SIGNATURE_HEADER]: signWebhookPayload(
        this.options.webhookSecret,
        body,
        Math.floor(now.getTime() / 1000),
      ),
    });
    return { body, headers, event };
  }
}

function parseEvent(data: unknown): WebhookEvent {
  const record = (data ?? {}) as Record<string, unknown>;
  const text = (key: string, max = 200) => {
    const value = record[key];
    if (typeof value !== 'string' || value.length === 0 || value.length > max) {
      throw new PaymentError('provider_error', `Campo "${key}" inválido no webhook.`);
    }
    return value;
  };
  const type = text('type') as WebhookEventType;
  if (!WEBHOOK_EVENT_TYPES.includes(type)) {
    throw new PaymentError('provider_error', 'Tipo de evento desconhecido.');
  }
  const reason = typeof record.reason === 'string' ? record.reason.slice(0, 300) : undefined;
  return {
    id: text('id'),
    type,
    chargeId: text('chargeId'),
    orderId: text('orderId'),
    occurredAt: text('occurredAt'),
    ...(reason ? { reason } : {}),
  };
}
