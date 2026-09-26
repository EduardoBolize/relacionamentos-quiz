import 'server-only';
import { ENGINE_SETTINGS_KEY, loadEngineSettings } from '@relacionamentos/db';
import { DEFAULT_PRICING_SETTINGS, type PricingSettings } from '@relacionamentos/payments';
import { engineSettingsSchema, type EngineSettings } from '@relacionamentos/quiz-engine';
import { z } from 'zod';
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

export const settingsUpdateSchema = z
  .object({
    engine: engineSettingsSchema.optional(),
    pricing: pricingSettingsSchema.optional(),
    payment: paymentSettingsSchema.optional(),
  })
  .strict();

async function readSetting<T>(key: string, schema: z.ZodType<T>, fallback: T): Promise<T> {
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

export const SETTING_KEYS = { engine: ENGINE_SETTINGS_KEY, pricing: 'pricing', payment: 'payment' } as const;
