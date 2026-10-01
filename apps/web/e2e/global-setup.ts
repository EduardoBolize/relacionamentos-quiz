import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { createAdminUser, createPrismaClient, findRepoRoot, resolveDatabaseUrl } from '@relacionamentos/db';
import { seedCourseContent } from '@relacionamentos/db/seed';
import { E2E_ENV } from '../playwright.config';

/** Banco novo para cada execução E2E + administrador com senha aleatória (passada aos testes por env). */
export default async function globalSetup() {
  const root = findRepoRoot();
  const url = resolveDatabaseUrl(E2E_ENV.DATABASE_URL, root);
  const file = url.slice('file:'.length);
  for (const suffix of ['', '-journal', '-wal', '-shm']) rmSync(`${file}${suffix}`, { force: true });

  execFileSync(process.execPath, [path.join(root, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'], {
    cwd: path.join(root, 'packages', 'db'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });

  const prisma = createPrismaClient(url);
  await seedCourseContent(prisma, { force: true, log: () => undefined });
  const password = randomBytes(18).toString('base64url');
  await createAdminUser(prisma, { email: 'e2e-admin@example.com', name: 'Admin E2E', password }, { logN: 12 });
  await prisma.$disconnect();

  process.env.E2E_ADMIN_EMAIL = 'e2e-admin@example.com';
  process.env.E2E_ADMIN_PASSWORD = password;
}
