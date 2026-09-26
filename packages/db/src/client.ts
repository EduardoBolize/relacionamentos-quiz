import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from './generated/prisma/client';
import { resolveDatabaseUrl } from './paths';

export function createPrismaClient(url: string = resolveDatabaseUrl()): PrismaClient {
  if (!url.startsWith('file:')) {
    throw new Error(
      'Este projeto está configurado para SQLite. Para PostgreSQL, troque o adapter em packages/db/src/client.ts (veja o README).',
    );
  }
  const file = url.slice('file:'.length);
  if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });

  const adapter = new PrismaBetterSqlite3({ url, timeout: 5000 });
  const client = new PrismaClient({ adapter });

  if (file !== ':memory:') {
    // WAL: leituras concorrentes durante escritas e sem criar/apagar um arquivo de journal a cada
    // transação (muito mais rápido, principalmente no Windows). NORMAL é seguro em modo WAL.
    void client
      .$queryRawUnsafe('PRAGMA journal_mode = WAL;')
      .then(() => client.$executeRawUnsafe('PRAGMA synchronous = NORMAL;'))
      .catch((error: unknown) => console.warn('[db] não foi possível ajustar o modo do SQLite', error));
  }
  return client;
}

const globalForPrisma = globalThis as unknown as { __relacionamentosPrisma?: PrismaClient };

/** Instância única por processo (evita abrir várias conexões durante o hot reload do Next.js). */
export function getPrisma(): PrismaClient {
  globalForPrisma.__relacionamentosPrisma ??= createPrismaClient();
  return globalForPrisma.__relacionamentosPrisma;
}
