import { createPrismaClient } from '../src/client';
import { loadRootEnv } from '../src/env';
import { ensureAdminFromEnv, seedCourseContent } from './seed-lib';

loadRootEnv();

const force = process.argv.includes('--force');
const prisma = createPrismaClient();

try {
  // WAL melhora a concorrência entre o servidor e scripts (a configuração fica gravada no arquivo).
  await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
  console.log('Semeando banco de dados…');
  await seedCourseContent(prisma, { force });
  await ensureAdminFromEnv(prisma);
  console.log('Pronto.');
} catch (error) {
  console.error('Falha ao semear o banco:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
