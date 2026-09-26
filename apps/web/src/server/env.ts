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
  TRUST_PROXY: bool('false'),
});

export type ServerEnv = z.infer<typeof schema>;

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
  if (env.NODE_ENV === 'production' && env.PAYMENT_SIMULATOR_ENABLED && env.PAYMENT_PROVIDER !== 'mock') {
    throw new Error('PAYMENT_SIMULATOR_ENABLED não pode ficar ativo com um provedor de pagamento real.');
  }
  cached = env;
  return env;
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

/** Somente para testes. */
export function resetEnvCache(): void {
  cached = null;
}
