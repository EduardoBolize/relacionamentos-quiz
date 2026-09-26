import { existsSync } from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';
import { findRepoRoot } from './paths';

/**
 * Carrega `.env.local` e `.env` da raiz do monorepo (sem sobrescrever variáveis já definidas).
 * Usado por scripts de linha de comando (seed, limpeza, criação de admin).
 */
export function loadRootEnv(): void {
  const root = findRepoRoot();
  for (const file of ['.env.local', '.env']) {
    const envPath = path.join(root, file);
    if (existsSync(envPath)) config({ path: envPath, override: false, quiet: true });
  }
}
