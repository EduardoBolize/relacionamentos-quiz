import { z } from 'zod';
import { conditionDepth } from './conditions';
import type { Condition, EngineSettings, RuleEffect } from './types';

/** Limite de aninhamento das condições (protege contra JSON excessivamente profundo). */
export const MAX_CONDITION_DEPTH = 6;

const idSchema = z.string().trim().min(1).max(64);

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(conditionSchema).max(20) }).strict(),
    z.object({ any: z.array(conditionSchema).max(20) }).strict(),
    z.object({ not: conditionSchema }).strict(),
    z
      .object({
        answer: z
          .object({
            questionId: idSchema,
            op: z.enum(['selected', 'notSelected', 'answered', 'notAnswered']),
            optionIds: z.array(idSchema).max(50).optional(),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        score: z
          .object({
            categoryId: idSchema,
            op: z.enum(['gte', 'gt', 'lte', 'lt']),
            value: z.number().min(0).max(100),
          })
          .strict(),
      })
      .strict(),
  ]),
);

/** Condição validada, incluindo o limite de profundidade. */
export const boundedConditionSchema = conditionSchema.refine(
  (condition) => conditionDepth(condition) <= MAX_CONDITION_DEPTH,
  { message: `A condição pode ter no máximo ${MAX_CONDITION_DEPTH} níveis de aninhamento.` },
);

export const ruleEffectSchema: z.ZodType<RuleEffect> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('addScore'), categoryId: idSchema, value: z.number().min(-100).max(100) }).strict(),
  z
    .object({ type: z.literal('multiplyScore'), categoryId: idSchema, factor: z.number().min(0).max(10) })
    .strict(),
  z.object({ type: z.literal('recommendModule'), moduleId: idSchema }).strict(),
  z
    .object({
      type: z.literal('addFlag'),
      flag: z
        .string()
        .trim()
        .regex(/^[a-z0-9_]{1,40}$/, 'Use apenas letras minúsculas, números e _'),
    })
    .strict(),
]);

export const ruleEffectsSchema = z.array(ruleEffectSchema).min(1).max(20);

export const engineSettingsSchema: z.ZodType<EngineSettings> = z
  .object({
    primaryMinScore: z.number().min(0).max(100),
    secondaryMinScore: z.number().min(0).max(100),
    maxSecondary: z.number().int().min(0).max(5),
  })
  .strict();

export const DEFAULT_ENGINE_SETTINGS: EngineSettings = {
  primaryMinScore: 35,
  secondaryMinScore: 30,
  maxSecondary: 2,
};

/** Lê uma condição armazenada como JSON (texto vazio/nulo = sem condição). */
export function parseConditionJson(json: string | null | undefined): Condition | null {
  if (json === null || json === undefined || json.trim() === '') return null;
  return boundedConditionSchema.parse(JSON.parse(json));
}

export function parseEffectsJson(json: string): RuleEffect[] {
  return ruleEffectsSchema.parse(JSON.parse(json));
}
