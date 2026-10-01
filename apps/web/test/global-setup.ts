import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { createPrismaClient, findRepoRoot, resolveDatabaseUrl } from '@relacionamentos/db';
import { seedCourseContent } from '@relacionamentos/db/seed';
import { TEST_ENV } from './test-env';

/**
 * Cria um banco SQLite novo só para os testes (data/test.db), aplica as migrações e grava o
 * conteúdo do curso. O banco de desenvolvimento nunca é tocado.
 */
export default async function setup() {
  Object.assign(process.env, TEST_ENV);
  const root = findRepoRoot();
  const url = resolveDatabaseUrl(TEST_ENV.DATABASE_URL, root);
  const file = url.slice('file:'.length);
  for (const suffix of ['', '-journal', '-wal', '-shm']) rmSync(`${file}${suffix}`, { force: true });

  // Executa a CLI do Prisma com o próprio Node (sem shell): argumentos nunca são interpretados.
  const prismaCli = path.join(root, 'node_modules', 'prisma', 'build', 'index.js');
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: path.join(root, 'packages', 'db'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });

  const prisma = createPrismaClient(url);
  await seedCourseContent(prisma, { force: true, log: () => undefined });
  await prisma.$disconnect();
}
