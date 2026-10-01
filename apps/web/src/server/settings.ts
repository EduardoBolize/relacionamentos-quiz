import 'server-only';
import { ENGINE_SETTINGS_KEY, loadEngineSettings } from '@relacionamentos/db';
import { DEFAULT_PRICING_SETTINGS, type PricingSettings } from '@relacionamentos/payments';
import { engineSettingsSchema, type EngineSettings } from '@relacionamentos/quiz-engine';
import { z } from 'zod';
import { isSafeExternalUrl } from '@/lib/links';
import { db } from './db';

export const pricingSettingsSchema: z.ZodType<PricingSettings> = z
  .object({
    comboDiscountPercent: z.number().int().min(0).max(50),
    comboMinItems: z.number().int().min(2).max(10),
    maxInstallments: z.number().int().min(1).max(12),
    minInstallmentCents: z.number().int().min(100).max(100_000),
  })
  .strict();

export interface PaymentSettings {
  pixExpirationMinutes: number;
  boletoDueDays: number;
}

export const paymentSettingsSchema: z.ZodType<PaymentSettings> = z
  .object({
    pixExpirationMinutes: z.number().int().min(5).max(1440),
    boletoDueDays: z.number().int().min(1).max(30),
  })
  .strict();

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = { pixExpirationMinutes: 30, boletoDueDays: 3 };

const externalUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(isSafeExternalUrl, 'Use um endereço completo começando com https://');

/** Texto vazio vira `null` (campo opcional nos formulários do admin). */
export const optionalExternalUrlSchema = z
  .union([z.literal(''), externalUrlSchema])
  .nullable()
  .transform((value) => (value ? value : null));

export interface CourseSettings {
  /** Prazo de garantia anunciado (dias). */
  guaranteeDays: number;
  /** Checkout externo do curso completo (ex.: Kiwify). `null` = checkout do próprio site. */
  fullCourseCheckoutUrl: string | null;
}

export const courseSettingsSchema: z.ZodType<CourseSettings, unknown> = z
  .object({
    guaranteeDays: z.number().int().min(0).max(90),
    fullCourseCheckoutUrl: optionalExternalUrlSchema,
  })
  .strict();

export const DEFAULT_COURSE_SETTINGS: CourseSettings = { guaranteeDays: 7, fullCourseCheckoutUrl: null };

export interface ObjectionAnswer {
  /** Sinalizador adicionado por uma regra do quiz (ex.: `objecao_preco`). */
  flag: string;
  title: string;
  answer: string;
}

export const objectionsSchema: z.ZodType<ObjectionAnswer[], unknown> = z
  .array(
    z
      .object({
        flag: z
          .string()
          .trim()
          .regex(/^[a-z0-9_]{1,40}$/, 'Use apenas letras minúsculas, números e _'),
        title: z.string().trim().min(2).max(120),
        answer: z.string().trim().min(10).max(1500),
      })
      .strict(),
  )
  .max(30)
  .refine((items) => new Set(items.map((item) => item.flag)).size === items.length, 'Cada sinalizador só pode aparecer uma vez.');

export const settingsUpdateSchema = z
  .object({
    engine: engineSettingsSchema.optional(),
    pricing: pricingSettingsSchema.optional(),
    payment: paymentSettingsSchema.optional(),
    course: courseSettingsSchema.optional(),
    objections: objectionsSchema.optional(),
  })
  .strict();

async function readSetting<T>(key: string, schema: z.ZodType<T, unknown>, fallback: T): Promise<T> {
  const row = await db().setting.findUnique({ where: { key } });
  if (!row) return fallback;
  try {
    return schema.parse(JSON.parse(row.value));
  } catch {
    return fallback;
  }
}

export function getPricingSettings(): Promise<PricingSettings> {
  return readSetting('pricing', pricingSettingsSchema, DEFAULT_PRICING_SETTINGS);
}

export function getPaymentSettings(): Promise<PaymentSettings> {
  return readSetting('payment', paymentSettingsSchema, DEFAULT_PAYMENT_SETTINGS);
}

export function getEngineSettings(): Promise<EngineSettings> {
  return loadEngineSettings(db());
}

export function getCourseSettings(): Promise<CourseSettings> {
  return readSetting('course', courseSettingsSchema, DEFAULT_COURSE_SETTINGS);
}

export function getObjections(): Promise<ObjectionAnswer[]> {
  return readSetting('objections', objectionsSchema, []);
}

export const SETTING_KEYS = {
  engine: ENGINE_SETTINGS_KEY,
  pricing: 'pricing',
  payment: 'payment',
  course: 'course',
  objections: 'objections',
} as const;
