/** Variáveis usadas por todos os testes de integração (banco próprio, nunca o de desenvolvimento). */
export const TEST_ENV = {
  NODE_ENV: 'test',
  DATABASE_URL: 'file:./data/test.db',
  APP_URL: 'http://localhost:3000',
  PAYMENT_PROVIDER: 'mock',
  PAYMENT_WEBHOOK_SECRET: 'segredo-de-webhook-para-testes-0123456789',
  PAYMENT_SIMULATOR_ENABLED: 'true',
  EMAIL_PROVIDER: 'outbox',
  TRUST_PROXY: 'false',
} as const;
