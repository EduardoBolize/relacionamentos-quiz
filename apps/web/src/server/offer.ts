import 'server-only';
import { calculateQuote, formatBRL } from '@relacionamentos/payments';
import { db } from './db';
import { getCourseSettings, getObjections, getPricingSettings, type ObjectionAnswer } from './settings';

/** Oferta atual do curso (valores sempre calculados a partir do cadastro e das configurações). */
export interface OfferInfo {
  moduleCount: number;
  /** Menor preço entre os módulos ativos ("a partir de"). */
  modulePriceCents: number;
  /** Soma dos módulos (valor cheio). */
  courseSubtotalCents: number;
  /** Valor do curso completo, já com o desconto de combo (se houver). */
  courseTotalCents: number;
  courseDiscountPercent: number;
  /** Maior número de parcelas disponível para o curso completo. */
  maxInstallments: number;
  installmentCents: number;
  guaranteeDays: number;
  /** Link do curso completo: checkout externo (ex.: Kiwify) ou checkout do site com todos os módulos. */
  fullCourseHref: string;
  fullCourseExternal: boolean;
}

export async function getOfferInfo(): Promise<OfferInfo> {
  const [modules, pricing, course] = await Promise.all([
    db().bookModule.findMany({ where: { active: true }, orderBy: [{ position: 'asc' }, { title: 'asc' }] }),
    getPricingSettings(),
    getCourseSettings(),
  ]);
  const quote = calculateQuote(
    modules.map((module) => ({ id: module.id, title: module.title, priceCents: module.priceCents })),
    pricing,
  );
  const lastInstallment = quote.installmentOptions[quote.installmentOptions.length - 1] ?? { count: 1, amountCents: quote.totalCents };
  return {
    moduleCount: modules.length,
    modulePriceCents: modules.length ? Math.min(...modules.map((module) => module.priceCents)) : 0,
    courseSubtotalCents: quote.subtotalCents,
    courseTotalCents: quote.totalCents,
    courseDiscountPercent: quote.discountPercent,
    maxInstallments: lastInstallment.count,
    installmentCents: lastInstallment.amountCents,
    guaranteeDays: course.guaranteeDays,
    fullCourseHref: course.fullCourseCheckoutUrl ?? `/checkout?modulos=${modules.map((module) => module.slug).join(',')}`,
    fullCourseExternal: Boolean(course.fullCourseCheckoutUrl),
  };
}

/**
 * Texto do parcelamento do curso completo. No checkout externo (ex.: Kiwify) o acréscimo das
 * parcelas é calculado por lá, então o valor da parcela não é anunciado aqui.
 */
export function installmentText(offer: OfferInfo): string | null {
  if (offer.maxInstallments <= 1) return null;
  return offer.fullCourseExternal
    ? `em até ${offer.maxInstallments}x no cartão`
    : `em até ${offer.maxInstallments}x de ${formatBRL(offer.installmentCents)} sem juros`;
}

/** Destino do botão de compra de um módulo: checkout externo cadastrado ou o checkout do site. */
export function moduleCheckoutHref(module: { slug: string; checkoutUrl: string | null }): { href: string; external: boolean } {
  return module.checkoutUrl ? { href: module.checkoutUrl, external: true } : { href: `/checkout?modulos=${module.slug}`, external: false };
}

/** Troca os marcadores das respostas às objeções pelos valores atuais da oferta. */
export function fillOfferPlaceholders(text: string, offer: OfferInfo): string {
  const values: Record<string, string> = {
    preco_modulo: formatBRL(offer.modulePriceCents),
    preco_curso: formatBRL(offer.courseTotalCents),
    parcelas: String(offer.maxInstallments),
    modulos: String(offer.moduleCount),
    garantia_dias: String(offer.guaranteeDays),
  };
  return text.replace(/\{([a-z_]+)\}/g, (match, key: string) => values[key] ?? match);
}

/** Respostas às objeções (todas, ou só as dos sinalizadores informados), com os valores atuais. */
export async function getObjectionAnswers(offer: OfferInfo, flags?: readonly string[]): Promise<ObjectionAnswer[]> {
  const objections = await getObjections();
  return objections
    .filter((objection) => !flags || flags.includes(objection.flag))
    .map((objection) => ({ ...objection, answer: fillOfferPlaceholders(objection.answer, offer) }));
}
