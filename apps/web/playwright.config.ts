import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de ponta a ponta. Rodam contra o BUILD DE PRODUÇÃO (valida também CSP e cabeçalhos),
 * com um banco próprio (data/e2e.db) — o banco de desenvolvimento não é tocado.
 *
 * Navegador: por padrão o Chromium do Playwright (`npx playwright install chromium`).
 * No Windows/macOS dá para usar o navegador já instalado: PLAYWRIGHT_CHANNEL=msedge (ou chrome).
 */
const PORT = 3100;
const channel = process.env.PLAYWRIGHT_CHANNEL || undefined;

export const E2E_ENV = {
  DATABASE_URL: 'file:./data/e2e.db',
  APP_URL: `http://localhost:${PORT}`,
  PAYMENT_PROVIDER: 'mock',
  PAYMENT_WEBHOOK_SECRET: 'segredo-de-webhook-somente-para-e2e-0123456789',
  PAYMENT_SIMULATOR_ENABLED: 'true',
  EMAIL_PROVIDER: 'outbox',
  TRUST_PROXY: 'false',
};

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'pt-BR',
    trace: 'retain-on-failure',
    ...(channel ? { channel } : {}),
  },
  projects: [
    { name: 'celular', use: { ...devices['Pixel 7'], ...(channel ? { channel } : {}) } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...(channel ? { channel } : {}) } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    // Arquivo estático: não depende do banco (que é preparado no global setup).
    url: `http://localhost:${PORT}/icon.svg`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: { ...E2E_ENV, NODE_ENV: 'production' },
  },
});
