import 'server-only';
import { z } from 'zod';

const bool = (fallback: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(fallback)
    .transform((value) => value === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.url().default('http://localhost:3000'),
  PAYMENT_PROVIDER: z.string().trim().min(1).default('mock'),
  PAYMENT_WEBHOOK_SECRET: z
    .string()
    .min(32, 'PAYMENT_WEBHOOK_SECRET deve ter pelo menos 32 caracteres (gere um valor aleatório).'),
  PAYMENT_SIMULATOR_ENABLED: bool('false'),
  EMAIL_PROVIDER: z.enum(['outbox', 'console']).default('console'),
  /**
   * Quantos proxies reversos confiáveis ficam na frente da aplicação (0 = nenhum). O IP do cliente é
   * lido do `X-Forwarded-For` contando esse número de saltos a partir da DIREITA — os valores da
   * esquerda podem ter sido enviados pelo próprio cliente.
   */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).optional(),
  /** Compatibilidade: TRUST_PROXY=true equivale a TRUST_PROXY_HOPS=1. */
  TRUST_PROXY: bool('false'),
  /**
   * Em produção, provedores de demonstração (pagamento "mock", e-mail "outbox") só são aceitos com esta
   * confirmação explícita — com eles, qualquer pessoa consegue liberar conteúdo pago.
   */
  ALLOW_DEMO_PROVIDERS: bool('false'),
});

export type ServerEnv = z.infer<typeof schema> & { trustedProxyHops: number };

let cached: ServerEnv | null = null;

/** Variáveis de ambiente validadas. Falha cedo, com mensagem clara, se algo estiver faltando. */
export function getEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Configuração inválida no .env:\n${problems}\nVeja o arquivo .env.example.`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production') {
    if (env.PAYMENT_SIMULATOR_ENABLED && env.PAYMENT_PROVIDER !== 'mock') {
      throw new Error('PAYMENT_SIMULATOR_ENABLED não pode ficar ativo com um provedor de pagamento real.');
    }
    const demo = [
      env.PAYMENT_PROVIDER === 'mock' ? 'PAYMENT_PROVIDER=mock (pagamentos simulados liberam conteúdo sem cobrança)' : null,
      env.EMAIL_PROVIDER === 'outbox' ? 'EMAIL_PROVIDER=outbox (links de acesso ficam gravados no banco)' : null,
    ].filter(Boolean);
    if (demo.length && !env.ALLOW_DEMO_PROVIDERS) {
      throw new Error(
        `Provedores de demonstração em produção:\n  - ${demo.join('\n  - ')}\n` +
          'Configure provedores reais ou, para uma demonstração consciente, defina ALLOW_DEMO_PROVIDERS=true.',
      );
    }
  }
  cached = { ...env, trustedProxyHops: env.TRUST_PROXY_HOPS ?? (env.TRUST_PROXY ? 1 : 0) };
  return cached;
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

/** Somente para testes. */
export function resetEnvCache(): void {
  cached = null;
}
