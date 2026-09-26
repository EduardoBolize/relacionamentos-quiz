import { MockPaymentGateway } from './mock/mock-gateway';
import type { PaymentGateway } from './types';

export interface PaymentGatewayConfig {
  /** Nome do provedor (variável de ambiente `PAYMENT_PROVIDER`). */
  provider: string;
  webhookSecret: string;
}

/**
 * Ponto único de escolha do provedor de pagamentos.
 *
 * Para integrar um provedor real:
 *   1. crie `src/<provedor>/<provedor>-gateway.ts` implementando `PaymentGateway`;
 *   2. adicione um `case` abaixo;
 *   3. troque o tokenizador de cartão no checkout pelo SDK do provedor;
 *   4. configure `PAYMENT_PROVIDER`, as chaves e a URL de webhook no painel do provedor.
 */
export function createPaymentGateway(config: PaymentGatewayConfig): PaymentGateway {
  switch (config.provider) {
    case 'mock':
      return new MockPaymentGateway({ webhookSecret: config.webhookSecret });
    default:
      throw new Error(
        `Provedor de pagamento "${config.provider}" não implementado. Consulte a seção "Pagamentos reais" do README.`,
      );
  }
}
