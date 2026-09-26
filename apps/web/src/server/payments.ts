import 'server-only';
import { createPaymentGateway, type MockPaymentGateway, type PaymentGateway } from '@relacionamentos/payments';
import { getEnv } from './env';

let gateway: PaymentGateway | null = null;

/** Gateway configurado por `PAYMENT_PROVIDER` (hoje: "mock"). */
export function getPaymentGateway(): PaymentGateway {
  const env = getEnv();
  gateway ??= createPaymentGateway({ provider: env.PAYMENT_PROVIDER, webhookSecret: env.PAYMENT_WEBHOOK_SECRET });
  return gateway;
}

/**
 * Verificação por capacidade (e não `instanceof`): o Next.js pode carregar o mesmo módulo em
 * camadas diferentes (páginas e rotas de API), e cada camada teria sua própria classe.
 */
function isMockGateway(candidate: PaymentGateway): candidate is MockPaymentGateway {
  return candidate.name === 'mock' && typeof (candidate as Partial<MockPaymentGateway>).buildSignedEvent === 'function';
}

/** O simulador só existe com o gateway simulado e quando explicitamente habilitado. */
export function getSimulatorGateway(): MockPaymentGateway | null {
  const current = getPaymentGateway();
  if (!getEnv().PAYMENT_SIMULATOR_ENABLED || !isMockGateway(current)) return null;
  return current;
}

export function isSimulatorEnabled(): boolean {
  return getSimulatorGateway() !== null;
}

/** Somente para testes. */
export function resetPaymentGateway(): void {
  gateway = null;
}
