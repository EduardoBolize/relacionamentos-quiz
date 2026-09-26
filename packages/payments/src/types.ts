/**
 * Contrato da camada de pagamentos.
 *
 * O restante do sistema só conhece esta interface. Para usar um provedor real (Mercado Pago,
 * Pagar.me, Asaas, Stripe, Efí…), basta implementar `PaymentGateway` e registrá-lo na fábrica
 * `createPaymentGateway` — nenhuma tela ou regra de negócio precisa mudar.
 */

export type PaymentMethod = 'pix' | 'boleto' | 'card';

export type ChargeStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'canceled' | 'refunded';

export interface Customer {
  name: string;
  email: string;
  /** CPF (somente dígitos). Obrigatório para boleto. */
  document?: string;
}

export interface CreateChargeInput {
  /** Referência interna do pedido (usada para conciliação e idempotência). */
  orderId: string;
  amountCents: number;
  description: string;
  method: PaymentMethod;
  customer: Customer;
  /** Cartão: número de parcelas. */
  installments?: number;
  /**
   * Cartão: token gerado no navegador pelo SDK do provedor. O número do cartão e o CVV
   * **nunca** passam pelo nosso servidor (reduz o escopo PCI-DSS).
   */
  cardToken?: string;
  /** Pix: validade do QR Code em minutos. */
  expiresInMinutes?: number;
  /** Boleto: dias até o vencimento. */
  dueInDays?: number;
}

export interface PixData {
  /** Código "copia e cola". */
  copyPasteCode: string;
  /** Imagem do QR Code (data URL PNG). */
  qrCodeDataUrl: string;
  expiresAt: string;
}

export interface BoletoData {
  digitableLine: string;
  barcode: string;
  /** Data de vencimento (AAAA-MM-DD). */
  dueDate: string;
}

export interface CardData {
  brand: string;
  last4: string;
  installments: number;
  authorizationCode?: string;
}

export interface Charge {
  id: string;
  status: ChargeStatus;
  method: PaymentMethod;
  amountCents: number;
  pix?: PixData;
  boleto?: BoletoData;
  card?: CardData;
  failureReason?: string;
  createdAt: string;
}

export type WebhookEventType =
  | 'charge.paid'
  | 'charge.failed'
  | 'charge.expired'
  | 'charge.canceled'
  | 'charge.refunded';

export const WEBHOOK_EVENT_TYPES: readonly WebhookEventType[] = [
  'charge.paid',
  'charge.failed',
  'charge.expired',
  'charge.canceled',
  'charge.refunded',
];

export interface WebhookEvent {
  /** Id único do evento (usado para idempotência). */
  id: string;
  type: WebhookEventType;
  chargeId: string;
  orderId: string;
  occurredAt: string;
  reason?: string;
}

export interface PaymentGateway {
  readonly name: string;
  createCharge(input: CreateChargeInput): Promise<Charge>;
  /**
   * Valida a assinatura e interpreta o corpo de um webhook.
   * Deve lançar `WebhookSignatureError` se a requisição não for autêntica.
   */
  parseWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent>;
}

export type PaymentErrorCode =
  | 'invalid_amount'
  | 'invalid_customer'
  | 'invalid_document'
  | 'invalid_card_token'
  | 'invalid_installments'
  | 'unsupported_method'
  | 'provider_error';

export class PaymentError extends Error {
  constructor(
    readonly code: PaymentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}
