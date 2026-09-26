import 'server-only';
import { checkPasswordStrength, hashPassword, verifyPassword, type Prisma } from '@relacionamentos/db';
import { formatBRL } from '@relacionamentos/payments';
import {
  boundedConditionSchema,
  collectClauses,
  ruleEffectsSchema,
  type Condition,
  type RuleEffect,
} from '@relacionamentos/quiz-engine';
import { z } from 'zod';
import { audit, type AdminContext } from '../auth/admin-auth';
import { db } from '../db';
import { invalidateQuizDefinition } from '../definition';
import { HttpError } from '../http';
import { SETTING_KEYS, settingsUpdateSchema } from '../settings';

// ───────────────────────────── Esquemas de entrada ─────────────────────────────

const id = z.string().trim().min(1).max(64);
const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use letras minúsculas, números e hífens (ex.: meu-modulo).');
const position = z.number().int().min(0).max(10_000);
const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value ? value : null));

export const categoryInputSchema = z
  .object({
    slug,
    name: z.string().trim().min(2).max(80),
    shortDescription: z.string().trim().max(200),
    explanation: z.string().trim().min(10, 'Escreva uma explicação cuidadosa (mín. 10 caracteres).').max(2000),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor no formato #RRGGBB.'),
    position,
    active: z.boolean(),
  })
  .strict();

export const stageInputSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500),
    position,
    active: z.boolean(),
    condition: boundedConditionSchema.nullable(),
    offerModuleId: id.nullable(),
    priceQuestionEnabled: z.boolean(),
    priceQuestionMinScore: z.number().int().min(0).max(100),
  })
  .strict();

export const questionInputSchema = z
  .object({
    stageId: id,
    text: z.string().trim().min(5).max(300),
    helpText: nullableText(300),
    type: z.enum(['single', 'multiple', 'scale']),
    required: z.boolean(),
    maxSelections: z.number().int().min(1).max(20).nullable(),
    scaleMinLabel: nullableText(40),
    scaleMaxLabel: nullableText(40),
    position,
    active: z.boolean(),
    condition: boundedConditionSchema.nullable(),
    options: z
      .array(
        z
          .object({
            id: id.optional(),
            label: z.string().trim().min(1).max(200),
            weights: z.record(id, z.number().int().min(-10).max(10)),
          })
          .strict(),
      )
      .min(2, 'Cadastre pelo menos 2 opções.')
      .max(15),
  })
  .strict();

export const ruleInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500),
    priority: z.number().int().min(-1000).max(1000),
    active: z.boolean(),
    condition: boundedConditionSchema,
    effects: ruleEffectsSchema,
  })
  .strict();

export const moduleInputSchema = z
  .object({
    slug,
    title: z.string().trim().min(2).max(120),
    subtitle: z.string().trim().max(160),
    description: z.string().trim().min(10).max(1000),
    previewContent: z.string().trim().min(10).max(20_000),
    content: z.string().trim().min(10).max(200_000),
    priceCents: z.number().int().min(0).max(10_000_000),
    coverEmoji: z.string().trim().min(1).max(8),
    position,
    active: z.boolean(),
    categoryIds: z.array(id).max(20),
  })
  .strict();

export const pricesInputSchema = z
  .object({ prices: z.array(z.object({ moduleId: id, priceCents: z.number().int().min(0).max(10_000_000) }).strict()).min(1).max(200) })
  .strict();

export const passwordChangeSchema = z
  .object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(1).max(200) })
  .strict();

// ───────────────────────────── Utilidades ─────────────────────────────

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002';
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2025';
}

async function guard<T>(operation: () => Promise<T>, conflictMessage = 'Já existe um item com este identificador.'): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, 'conflict', conflictMessage);
    if (isNotFound(error)) throw new HttpError(404, 'not_found', 'Item não encontrado.');
    throw error;
  }
}

function done<T>(value: T): T {
  invalidateQuizDefinition();
  return value;
}

type Tx = Prisma.TransactionClient;

/** Garante que perguntas, opções e categorias citadas em uma condição existem. */
async function assertConditionReferences(tx: Tx, condition: Condition | null): Promise<void> {
  if (!condition) return;
  const questionIds = new Set<string>();
  const optionRefs: { questionId: string; optionId: string }[] = [];
  const categoryIds = new Set<string>();
  collectClauses(condition, (clause) => {
    if ('answer' in clause) {
      questionIds.add(clause.answer.questionId);
      for (const optionId of clause.answer.optionIds ?? []) optionRefs.push({ questionId: clause.answer.questionId, optionId });
    } else {
      categoryIds.add(clause.score.categoryId);
    }
  });

  if (questionIds.size) {
    const found = await tx.question.count({ where: { id: { in: [...questionIds] } } });
    if (found !== questionIds.size) throw new HttpError(422, 'invalid_reference', 'A condição usa uma pergunta que não existe.');
  }
  if (optionRefs.length) {
    const options = await tx.option.findMany({ where: { id: { in: optionRefs.map((ref) => ref.optionId) } } });
    const owner = new Map(options.map((option) => [option.id, option.questionId]));
    if (optionRefs.some((ref) => owner.get(ref.optionId) !== ref.questionId)) {
      throw new HttpError(422, 'invalid_reference', 'A condição usa uma opção que não pertence à pergunta escolhida.');
    }
  }
  if (categoryIds.size) {
    const found = await tx.category.count({ where: { id: { in: [...categoryIds] } } });
    if (found !== categoryIds.size) throw new HttpError(422, 'invalid_reference', 'A condição usa uma categoria que não existe.');
  }
}

async function assertEffectReferences(tx: Tx, effects: RuleEffect[]): Promise<void> {
  const categoryIds = new Set<string>();
  const moduleIds = new Set<string>();
  for (const effect of effects) {
    if (effect.type === 'addScore' || effect.type === 'multiplyScore') categoryIds.add(effect.categoryId);
    if (effect.type === 'recommendModule') moduleIds.add(effect.moduleId);
  }
  if (categoryIds.size && (await tx.category.count({ where: { id: { in: [...categoryIds] } } })) !== categoryIds.size) {
    throw new HttpError(422, 'invalid_reference', 'Um efeito usa uma categoria que não existe.');
  }
  if (moduleIds.size && (await tx.bookModule.count({ where: { id: { in: [...moduleIds] } } })) !== moduleIds.size) {
    throw new HttpError(422, 'invalid_reference', 'Um efeito recomenda um módulo que não existe.');
  }
}

// ───────────────────────────── Categorias ─────────────────────────────

export async function saveCategory(admin: AdminContext, categoryId: string | null, raw: unknown) {
  const input = categoryInputSchema.parse(raw);
  const category = await guard(
    () =>
      categoryId
        ? db().category.update({ where: { id: categoryId }, data: input })
        : db().category.create({ data: input }),
    'Já existe uma categoria com este identificador (slug).',
  );
  await audit(admin.id, categoryId ? 'update' : 'create', 'category', category.id, `Categoria "${category.name}"`);
  return done(category);
}

export async function deleteCategory(admin: AdminContext, categoryId: string) {
  const category = await guard(() => db().category.delete({ where: { id: categoryId } }));
  await audit(admin.id, 'delete', 'category', categoryId, `Categoria "${category.name}" excluída`);
  return done(category);
}

// ───────────────────────────── Etapas ─────────────────────────────

export async function saveStage(admin: AdminContext, stageId: string | null, raw: unknown) {
  const input = stageInputSchema.parse(raw);
  const stage = await db().$transaction(async (tx) => {
    await assertConditionReferences(tx, input.condition);
    if (input.offerModuleId && !(await tx.bookModule.count({ where: { id: input.offerModuleId } }))) {
      throw new HttpError(422, 'invalid_reference', 'Módulo ofertado não encontrado.');
    }
    const { condition, ...fields } = input;
    const data = { ...fields, conditionJson: condition ? JSON.stringify(condition) : null };
    return stageId ? tx.stage.update({ where: { id: stageId }, data }) : tx.stage.create({ data });
  });
  await audit(admin.id, stageId ? 'update' : 'create', 'stage', stage.id, `Etapa "${stage.title}"`);
  return done(stage);
}

export async function deleteStage(admin: AdminContext, stageId: string) {
  const stage = await guard(() => db().stage.delete({ where: { id: stageId } }));
  await audit(admin.id, 'delete', 'stage', stageId, `Etapa "${stage.title}" excluída (com suas perguntas)`);
  return done(stage);
}

// ───────────────────────────── Perguntas ─────────────────────────────

export async function saveQuestion(admin: AdminContext, questionId: string | null, raw: unknown) {
  const input = questionInputSchema.parse(raw);

  const question = await db().$transaction(
    async (tx) => {
      if (!(await tx.stage.count({ where: { id: input.stageId } }))) {
        throw new HttpError(422, 'invalid_reference', 'Etapa não encontrada.');
      }
      await assertConditionReferences(tx, input.condition);
      if (questionId && input.condition) {
        let selfReference = false;
        collectClauses(input.condition, (clause) => {
          if ('answer' in clause && clause.answer.questionId === questionId) selfReference = true;
        });
        if (selfReference) throw new HttpError(422, 'invalid_reference', 'Uma pergunta não pode depender da própria resposta.');
      }

      const referencedCategories = [...new Set(input.options.flatMap((option) => Object.keys(option.weights)))];
      const existingCategories = new Set(
        (await tx.category.findMany({ where: { id: { in: referencedCategories } }, select: { id: true } })).map((c) => c.id),
      );
      if (referencedCategories.some((categoryId) => !existingCategories.has(categoryId))) {
        throw new HttpError(422, 'invalid_reference', 'Algum peso aponta para uma categoria inexistente.');
      }

      const data = {
        stageId: input.stageId,
        text: input.text,
        helpText: input.helpText,
        type: input.type,
        required: input.required,
        maxSelections: input.type === 'multiple' ? input.maxSelections : null,
        scaleMinLabel: input.type === 'scale' ? input.scaleMinLabel : null,
        scaleMaxLabel: input.type === 'scale' ? input.scaleMaxLabel : null,
        position: input.position,
        active: input.active,
        conditionJson: input.condition ? JSON.stringify(input.condition) : null,
      };
      const saved = questionId ? await tx.question.update({ where: { id: questionId }, data }) : await tx.question.create({ data });

      // Opções: mantém ids existentes (preserva respostas e regras), cria as novas e remove as retiradas.
      const current = await tx.option.findMany({ where: { questionId: saved.id }, select: { id: true } });
      const currentIds = new Set(current.map((option) => option.id));
      const keptIds = new Set(input.options.map((option) => option.id).filter((optionId): optionId is string => !!optionId && currentIds.has(optionId)));
      await tx.option.deleteMany({ where: { questionId: saved.id, id: { notIn: [...keptIds] } } });

      for (const [index, option] of input.options.entries()) {
        const persisted =
          option.id && keptIds.has(option.id)
            ? await tx.option.update({ where: { id: option.id }, data: { label: option.label, position: index } })
            : await tx.option.create({ data: { questionId: saved.id, label: option.label, position: index } });
        await tx.optionWeight.deleteMany({ where: { optionId: persisted.id } });
        const weights = Object.entries(option.weights).filter(([, weight]) => weight !== 0);
        if (weights.length) {
          await tx.optionWeight.createMany({
            data: weights.map(([categoryId, weight]) => ({ optionId: persisted.id, categoryId, weight })),
          });
        }
      }
      return saved;
    },
    { timeout: 20_000 },
  );

  await audit(admin.id, questionId ? 'update' : 'create', 'question', question.id, `Pergunta "${question.text.slice(0, 80)}"`);
  return done(question);
}

export async function deleteQuestion(admin: AdminContext, questionId: string) {
  const question = await guard(() => db().question.delete({ where: { id: questionId } }));
  await audit(admin.id, 'delete', 'question', questionId, `Pergunta "${question.text.slice(0, 80)}" excluída`);
  return done(question);
}

// ───────────────────────────── Regras ─────────────────────────────

export async function saveRule(admin: AdminContext, ruleId: string | null, raw: unknown) {
  const input = ruleInputSchema.parse(raw);
  const rule = await db().$transaction(async (tx) => {
    await assertConditionReferences(tx, input.condition);
    await assertEffectReferences(tx, input.effects);
    const data = {
      name: input.name,
      description: input.description,
      priority: input.priority,
      active: input.active,
      conditionJson: JSON.stringify(input.condition),
      effectsJson: JSON.stringify(input.effects),
    };
    return ruleId ? tx.rule.update({ where: { id: ruleId }, data }) : tx.rule.create({ data });
  });
  await audit(admin.id, ruleId ? 'update' : 'create', 'rule', rule.id, `Regra "${rule.name}"`);
  return done(rule);
}

export async function deleteRule(admin: AdminContext, ruleId: string) {
  const rule = await guard(() => db().rule.delete({ where: { id: ruleId } }));
  await audit(admin.id, 'delete', 'rule', ruleId, `Regra "${rule.name}" excluída`);
  return done(rule);
}

// ───────────────────────────── Módulos e preços ─────────────────────────────

export async function saveModule(admin: AdminContext, moduleId: string | null, raw: unknown) {
  const { categoryIds: rawCategoryIds, ...data } = moduleInputSchema.parse(raw);
  const bookModule = await guard(
    () =>
      db().$transaction(async (tx) => {
        const categoryIds = [...new Set(rawCategoryIds)];
        if ((await tx.category.count({ where: { id: { in: categoryIds } } })) !== categoryIds.length) {
          throw new HttpError(422, 'invalid_reference', 'Alguma categoria selecionada não existe.');
        }
        const saved = moduleId
          ? await tx.bookModule.update({ where: { id: moduleId }, data })
          : await tx.bookModule.create({ data });
        await tx.moduleCategory.deleteMany({ where: { moduleId: saved.id } });
        if (categoryIds.length) {
          await tx.moduleCategory.createMany({ data: categoryIds.map((categoryId) => ({ moduleId: saved.id, categoryId })) });
        }
        return saved;
      }),
    'Já existe um módulo com este identificador (slug).',
  );
  await audit(admin.id, moduleId ? 'update' : 'create', 'module', bookModule.id, `Módulo "${bookModule.title}" (${formatBRL(bookModule.priceCents)})`);
  return done(bookModule);
}

export async function deleteModule(admin: AdminContext, moduleId: string) {
  const sold = await db().orderItem.count({ where: { moduleId } });
  if (sold > 0) {
    throw new HttpError(409, 'module_sold', 'Este módulo já foi vendido e não pode ser excluído. Desative-o para escondê-lo.');
  }
  const bookModule = await guard(() => db().bookModule.delete({ where: { id: moduleId } }));
  await audit(admin.id, 'delete', 'module', moduleId, `Módulo "${bookModule.title}" excluído`);
  return done(bookModule);
}

export async function updatePrices(admin: AdminContext, raw: unknown) {
  const { prices } = pricesInputSchema.parse(raw);
  const changes = await db().$transaction(async (tx) => {
    const summaries: string[] = [];
    for (const { moduleId, priceCents } of prices) {
      const current = await tx.bookModule.findUnique({ where: { id: moduleId } });
      if (!current) throw new HttpError(404, 'not_found', 'Módulo não encontrado.');
      if (current.priceCents === priceCents) continue;
      await tx.bookModule.update({ where: { id: moduleId }, data: { priceCents } });
      summaries.push(`${current.title}: ${formatBRL(current.priceCents)} → ${formatBRL(priceCents)}`);
    }
    return summaries;
  });
  if (changes.length) await audit(admin.id, 'update', 'prices', null, changes.join('; '));
  return done({ updated: changes.length });
}

// ───────────────────────────── Configurações e conta ─────────────────────────────

export async function updateSettings(admin: AdminContext, raw: unknown) {
  const input = settingsUpdateSchema.parse(raw);
  const entries = Object.entries(input).filter(([, value]) => value !== undefined) as [keyof typeof SETTING_KEYS, unknown][];
  await db().$transaction(
    entries.map(([key, value]) =>
      db().setting.upsert({
        where: { key: SETTING_KEYS[key] },
        create: { key: SETTING_KEYS[key], value: JSON.stringify(value) },
        update: { value: JSON.stringify(value) },
      }),
    ),
  );
  await audit(admin.id, 'update', 'settings', null, `Configurações alteradas: ${entries.map(([key]) => key).join(', ')}`);
  return done({ updated: entries.length });
}

export async function changeOwnPassword(admin: AdminContext, raw: unknown) {
  const { currentPassword, newPassword } = passwordChangeSchema.parse(raw);
  const user = await db().adminUser.findUniqueOrThrow({ where: { id: admin.id } });
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new HttpError(422, 'invalid_password', 'A senha atual está incorreta.');
  }
  const problem = checkPasswordStrength(newPassword);
  if (problem) throw new HttpError(422, 'weak_password', problem);
  if (newPassword === currentPassword) throw new HttpError(422, 'same_password', 'A nova senha deve ser diferente da atual.');

  await db().$transaction([
    db().adminUser.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(newPassword) } }),
    // encerra as outras sessões abertas
    db().adminSession.deleteMany({ where: { adminId: admin.id, id: { not: admin.sessionId } } }),
  ]);
  await audit(admin.id, 'password_change', 'admin', admin.id, 'Senha alterada; outras sessões encerradas');
}
