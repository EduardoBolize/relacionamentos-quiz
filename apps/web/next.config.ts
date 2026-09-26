import { existsSync } from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import type { NextConfig } from 'next';

// O `.env` fica na raiz do monorepo (compartilhado com scripts do banco e testes).
// Variáveis já definidas no ambiente (ex.: pelo servidor de produção) têm prioridade.
const repoRoot = path.resolve(process.cwd(), '../..');
for (const file of ['.env.local', '.env']) {
  const envPath = path.join(repoRoot, file);
  if (existsSync(envPath)) loadDotenv({ path: envPath, override: false, quiet: true });
}

const isProduction = process.env.NODE_ENV === 'production';

/** Cabeçalhos de segurança aplicados a todas as respostas. O CSP (com nonce) é definido em `src/proxy.ts`. */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  ...(isProduction ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }] : []),
];

/** Páginas com dados pessoais: nunca indexar, nunca guardar em cache, nunca vazar a URL (que contém o token). */
const privateHeaders = [
  { key: 'Cache-Control', value: 'no-store, max-age=0' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
  transpilePackages: [
    '@relacionamentos/quiz-engine',
    '@relacionamentos/payments',
    '@relacionamentos/analytics',
    '@relacionamentos/db',
  ],
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      ...['/resultado/:path*', '/pedido/:path*', '/recuperar/:path*', '/admin/:path*', '/api/:path*'].map(
        (source) => ({ source, headers: privateHeaders }),
      ),
    ];
  },
};

export default nextConfig;
