import { checkPasswordStrength, createAdminUser, normalizeEmail } from '../src/admin-users';
import type { PrismaClient } from '../src/generated/prisma/client';
import { demoCategories, demoModules, demoRules, demoSettings, demoStages } from './demo-content';

type Log = (message: string) => void;

/**
 * Grava o conteúdo de demonstração. É idempotente: usa `upsert` com ids fixos, então rodar de novo
 * não duplica nada. Sem `force`, não mexe em um banco que já tem conteúdo (preserva edições do admin).
 */
export async function seedDemoContent(
  prisma: PrismaClient,
  { force = false, log = console.log as Log } = {},
): Promise<{ seeded: boolean }> {
  const existing = await prisma.category.count();
  if (existing > 0 && !force) {
    log('• Conteúdo já existe — mantido (use --force para restaurar o conteúdo de demonstração).');
    await seedSettings(prisma, false);
    return { seeded: false };
  }

  await prisma.$transaction(
    async (tx) => {
      for (const [position, category] of demoCategories.entries()) {
        const data = { ...category, position, active: true };
        await tx.category.upsert({ where: { id: category.id }, create: data, update: data });
      }

      for (const [position, module] of demoModules.entries()) {
        const { categoryIds, ...fields } = module;
        const data = { ...fields, position, active: true };
        await tx.bookModule.upsert({ where: { id: module.id }, create: data, update: data });
        await tx.moduleCategory.deleteMany({ where: { moduleId: module.id } });
        await tx.moduleCategory.createMany({
          data: categoryIds.map((categoryId) => ({ moduleId: module.id, categoryId })),
        });
      }

      for (const [stagePosition, stage] of demoStages.entries()) {
        const stageData = {
          title: stage.title,
          description: stage.description,
          position: stagePosition,
          active: true,
          conditionJson: null,
          offerModuleId: stage.offerModuleId ?? null,
          priceQuestionEnabled: stage.priceQuestionEnabled ?? true,
          priceQuestionMinScore: stage.priceQuestionMinScore ?? 0,
        };
        await tx.stage.upsert({ where: { id: stage.id }, create: { id: stage.id, ...stageData }, update: stageData });

        for (const [questionPosition, question] of stage.questions.entries()) {
          const questionData = {
            stageId: stage.id,
            text: question.text,
            helpText: question.helpText ?? null,
            type: question.type,
            required: question.required ?? true,
            maxSelections: question.maxSelections ?? null,
            scaleMinLabel: question.scaleMinLabel ?? null,
            scaleMaxLabel: question.scaleMaxLabel ?? null,
            position: questionPosition,
            active: true,
            conditionJson: question.condition ? JSON.stringify(question.condition) : null,
          };
          await tx.question.upsert({
            where: { id: question.id },
            create: { id: question.id, ...questionData },
            update: questionData,
          });
          await tx.option.deleteMany({
            where: { questionId: question.id, id: { notIn: question.options.map((option) => option.id) } },
          });

          for (const [optionPosition, option] of question.options.entries()) {
            const optionData = { questionId: question.id, label: option.label, position: optionPosition };
            await tx.option.upsert({ where: { id: option.id }, create: { id: option.id, ...optionData }, update: optionData });
            await tx.optionWeight.deleteMany({ where: { optionId: option.id } });
            const weights = Object.entries(option.weights ?? {}).filter(([, weight]) => weight !== 0);
            if (weights.length > 0) {
              await tx.optionWeight.createMany({
                data: weights.map(([categoryId, weight]) => ({ optionId: option.id, categoryId, weight })),
              });
            }
          }
        }
      }

      for (const rule of demoRules) {
        const data = {
          name: rule.name,
          description: rule.description,
          priority: rule.priority,
          active: true,
          conditionJson: JSON.stringify(rule.condition),
          effectsJson: JSON.stringify(rule.effects),
        };
        await tx.rule.upsert({ where: { id: rule.id }, create: { id: rule.id, ...data }, update: data });
      }
    },
    { timeout: 60_000 },
  );

  await seedSettings(prisma, force);
  log(
    `• Conteúdo de demonstração gravado: ${demoCategories.length} categorias, ${demoModules.length} módulos, ` +
      `${demoStages.length} etapas, ${demoStages.reduce((n, s) => n + s.questions.length, 0)} perguntas e ${demoRules.length} regras.`,
  );
  return { seeded: true };
}

async function seedSettings(prisma: PrismaClient, overwrite: boolean): Promise<void> {
  for (const [key, value] of Object.entries(demoSettings)) {
    const json = JSON.stringify(value);
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: json },
      update: overwrite ? { value: json } : {},
    });
  }
}

/** Cria o primeiro administrador a partir de ADMIN_EMAIL / ADMIN_PASSWORD, se ainda não existir. */
export async function ensureAdminFromEnv(prisma: PrismaClient, log: Log = console.log): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD ?? '';
  if (!email || !password) {
    log('• ADMIN_EMAIL/ADMIN_PASSWORD não definidos no .env — nenhum administrador criado.');
    return;
  }
  const existing = await prisma.adminUser.findUnique({ where: { email: normalizeEmail(email) } });
  if (existing) {
    log(`• Administrador ${existing.email} já existe (senha mantida).`);
    return;
  }
  const problem = checkPasswordStrength(password);
  if (problem) {
    log(`• ADMIN_PASSWORD recusada: ${problem} Nenhum administrador criado.`);
    return;
  }
  const admin = await createAdminUser(prisma, { email, name: process.env.ADMIN_NAME ?? 'Administrador', password });
  log(`• Administrador ${admin.email} criado. Acesse /admin/login.`);
}
