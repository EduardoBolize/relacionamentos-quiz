// Ponto de entrada do SERVIDOR. Para código que roda no navegador, use `@relacionamentos/payments/client`.
export * from './types';
export * from './money';
export * from './pricing';
export * from './card';
export * from './document';
export * from './webhook';
export { createPaymentGateway, type PaymentGatewayConfig } from './gateway';
export { MockPaymentGateway, MOCK_SIGNATURE_HEADER, type MockGatewayOptions } from './mock/mock-gateway';
export { buildMockPixPayload, crc16ccitt, MOCK_PIX_GUI } from './mock/pix';
export { buildMockBoleto, dueDateFactor, mod10, mod11 } from './mock/boleto';
export {
  TEST_CARDS,
  CARD_FAILURE_MESSAGES,
  decodeMockCardToken,
  encodeMockCardToken,
  type MockCardOutcome,
  type TestCard,
} from './mock/card-token';
