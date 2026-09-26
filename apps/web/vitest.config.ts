import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { TEST_ENV } from './test/test-env.ts';

const dir = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': dir('./src'),
      'server-only': dir('./test/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globalSetup: ['./test/global-setup.ts'],
    env: { ...TEST_ENV },
    // Um único banco SQLite compartilhado: arquivos de teste rodam em sequência.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
