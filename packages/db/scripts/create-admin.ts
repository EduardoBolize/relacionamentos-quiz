/**
 * Cria (ou redefine a senha de) um administrador.
 *
 *   npm run admin:create -- --email pessoa@exemplo.com --name "Pessoa"
 *   npm run admin:create -- --email pessoa@exemplo.com --reset-password
 *
 * A senha é pedida no terminal (sem eco). Em ambientes sem terminal, use a variável ADMIN_PASSWORD.
 */
import { createInterface } from 'node:readline/promises';
import { checkPasswordStrength, createAdminUser, hashPassword, normalizeEmail } from '../src/admin-users';
import { createPrismaClient } from '../src/client';
import { loadRootEnv } from '../src/env';

loadRootEnv();

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function promptHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin });
    const line = await rl.question(question);
    rl.close();
    return line;
  }
  process.stdout.write(question);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  return new Promise((resolve) => {
    let value = '';
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n' || char === '\u0004') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.off('data', onData);
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u0003') process.exit(130);
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
      }
    };
    process.stdin.on('data', onData);
  });
}

const email = arg('email') ?? process.env.ADMIN_EMAIL;
const name = arg('name') ?? process.env.ADMIN_NAME ?? 'Administrador';
const reset = process.argv.includes('--reset-password');

if (!email) {
  console.error('Informe o e-mail: npm run admin:create -- --email pessoa@exemplo.com');
  process.exit(1);
}

const prisma = createPrismaClient();
try {
  const password = process.env.ADMIN_PASSWORD_INPUT ?? (await promptHidden('Senha (mín. 12 caracteres): '));
  const problem = checkPasswordStrength(password);
  if (problem) throw new Error(problem);

  const existing = await prisma.adminUser.findUnique({ where: { email: normalizeEmail(email) } });
  if (existing && !reset) {
    throw new Error('Já existe um administrador com este e-mail. Use --reset-password para trocar a senha.');
  }
  if (existing) {
    await prisma.$transaction([
      prisma.adminUser.update({
        where: { id: existing.id },
        data: { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null },
      }),
      // encerra as sessões abertas com a senha antiga
      prisma.adminSession.deleteMany({ where: { adminId: existing.id } }),
      prisma.auditLog.create({
        data: { adminId: existing.id, action: 'password_reset', entity: 'admin', entityId: existing.id, summary: 'Senha redefinida via CLI' },
      }),
    ]);
    console.log(`Senha de ${existing.email} redefinida e sessões encerradas.`);
  } else {
    const admin = await createAdminUser(prisma, { email, name, password });
    console.log(`Administrador ${admin.email} criado.`);
  }
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
