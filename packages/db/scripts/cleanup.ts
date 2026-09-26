/**
 * Retenção de dados (LGPD — minimização). Rode periodicamente (ex.: cron diário):
 *
 *   npm run db:cleanup
 *   npm run db:cleanup -- --dry-run
 *
 * Remove: quizzes não concluídos antigos, tokens de recuperação expirados, sessões de admin
 * expiradas, e-mails de simulação antigos e eventos de analytics antigos.
 */
import { createPrismaClient } from '../src/client';
import { loadRootEnv } from '../src/env';

loadRootEnv();

const DAY = 86_400_000;
const dryRun = process.argv.includes('--dry-run');
const now = Date.now();

const policies = {
  incompleteSessionsDays: 30,
  emailOutboxDays: 30,
  analyticsDays: 365,
};

const prisma = createPrismaClient();

try {
  const targets = {
    'Quizzes não concluídos': {
      count: () => prisma.quizSession.count({ where: { status: 'in_progress', updatedAt: { lt: new Date(now - policies.incompleteSessionsDays * DAY) } } }),
      remove: () => prisma.quizSession.deleteMany({ where: { status: 'in_progress', updatedAt: { lt: new Date(now - policies.incompleteSessionsDays * DAY) } } }),
    },
    'Links de recuperação expirados': {
      count: () => prisma.recoveryToken.count({ where: { expiresAt: { lt: new Date(now) } } }),
      remove: () => prisma.recoveryToken.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
    },
    'Sessões de admin expiradas': {
      count: () => prisma.adminSession.count({ where: { expiresAt: { lt: new Date(now) } } }),
      remove: () => prisma.adminSession.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
    },
    'E-mails de simulação antigos': {
      count: () => prisma.emailOutbox.count({ where: { createdAt: { lt: new Date(now - policies.emailOutboxDays * DAY) } } }),
      remove: () => prisma.emailOutbox.deleteMany({ where: { createdAt: { lt: new Date(now - policies.emailOutboxDays * DAY) } } }),
    },
    'Eventos de analytics antigos': {
      count: () => prisma.analyticsEvent.count({ where: { createdAt: { lt: new Date(now - policies.analyticsDays * DAY) } } }),
      remove: () => prisma.analyticsEvent.deleteMany({ where: { createdAt: { lt: new Date(now - policies.analyticsDays * DAY) } } }),
    },
  };

  for (const [label, target] of Object.entries(targets)) {
    const count = await target.count();
    if (!dryRun && count > 0) await target.remove();
    console.log(`${dryRun ? '[simulação] ' : ''}${label}: ${count}`);
  }
} finally {
  await prisma.$disconnect();
}
