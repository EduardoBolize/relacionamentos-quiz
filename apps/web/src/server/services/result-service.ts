import 'server-only';
import type { QuizResult } from '@relacionamentos/quiz-engine';
import { normalizeEmail } from '@relacionamentos/db';
import { z } from 'zod';
import type { ResultModuleDTO, ResultViewDTO, ThemeDTO } from '@/lib/dto';
import { db } from '../db';
import { absoluteUrl, emailTemplates, sendEmailSafely } from '../email';
import { HttpError } from '../http';
import { moduleCheckoutHref } from '../offer';
import { HOUR, enforceClientRateLimit, enforceRateLimit } from '../security/rate-limit';
import { generateToken, hashToken, isValidTokenFormat } from '../security/tokens';
import { findSessionAccess, findSessionByToken } from './quiz-service';

const RECOVERY_TTL_MS = 30 * 60 * 1000;

export const emailSchema = z
  .string()
  .trim()
  .max(254)
  .pipe(z.email({ message: 'Informe um e-mail válido.' }));

/** Validação mínima do resultado salvo (protege contra JSON corrompido). */
const storedResultSchema = z.object({
  primary: z.object({ categoryId: z.string(), score: z.number() }).nullable(),
  secondary: z.array(z.object({ categoryId: z.string(), score: z.number() })),
  scores: z.array(z.object({ categoryId: z.string(), score: z.number() })),
  recommendedModules: z.array(
    z.object({
      moduleId: z.string(),
      reason: z.enum(['primary', 'secondary', 'rule', 'price_agreed', 'explore']),
      categoryId: z.string().optional(),
      priceAgreement: z.enum(['agree', 'maybe', 'disagree']).optional(),
      preselected: z.boolean(),
    }),
  ),
  flags: z.array(z.string()),
});

export function parseStoredResult(json: string | null): Pick<QuizResult, 'primary' | 'secondary' | 'scores' | 'recommendedModules' | 'flags'> | null {
  if (!json) return null;
  try {
    const parsed = storedResultSchema.safeParse(JSON.parse(json));
    return parsed.success ? (parsed.data as unknown as QuizResult) : null;
  } catch {
    return null;
  }
}

/**
 * Monta a página de resultado. Pontuações e recomendações vêm do resultado "congelado" na conclusão;
 * nomes, explicações e preços vêm do cadastro atual (assim correções de texto feitas no admin aparecem).
 */
export async function getResultView(token: string): Promise<ResultViewDTO | null> {
  const access = await findSessionAccess(token);
  if (!access || access.session.status !== 'completed') return null;
  const { session, scope } = access;
  const result = parseStoredResult(session.resultJson);
  if (!result) return null;

  const [categories, modules] = await Promise.all([
    db().category.findMany(),
    db().bookModule.findMany({
      where: { id: { in: result.recommendedModules.map((m) => m.moduleId) }, active: true },
      include: { _count: { select: { videos: { where: { active: true } } } } },
    }),
  ]);
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const theme = (entry: { categoryId: string; score: number }): ThemeDTO | null => {
    const category = categoryById.get(entry.categoryId);
    if (!category) return null;
    return {
      categoryId: category.id,
      name: category.name,
      color: category.color,
      score: Math.round(entry.score),
      shortDescription: category.shortDescription,
      explanation: category.explanation,
    };
  };
  const themes = (entries: { categoryId: string; score: number }[]) =>
    entries.map(theme).filter((value): value is ThemeDTO => value !== null);

  const moduleById = new Map(modules.map((bookModule) => [bookModule.id, bookModule]));
  const recommended: ResultModuleDTO[] = result.recommendedModules.flatMap((entry) => {
    const bookModule = moduleById.get(entry.moduleId);
    if (!bookModule) return [];
    const buy = moduleCheckoutHref(bookModule);
    return [
      {
        id: bookModule.id,
        slug: bookModule.slug,
        title: bookModule.title,
        subtitle: bookModule.subtitle,
        description: bookModule.description,
        previewContent: bookModule.previewContent,
        priceCents: bookModule.priceCents,
        coverEmoji: bookModule.coverEmoji,
        reason: entry.reason,
        categoryName: entry.categoryId ? (categoryById.get(entry.categoryId)?.name ?? null) : null,
        priceAgreement: entry.priceAgreement ?? null,
        preselected: entry.preselected,
        videoCount: bookModule._count.videos,
        buyHref: buy.href,
        buyExternal: buy.external,
      },
    ];
  });

  return {
    completedAt: (session.completedAt ?? session.updatedAt).toISOString(),
    primary: result.primary ? theme(result.primary) : null,
    secondary: themes(result.secondary),
    scores: themes(result.scores),
    modules: recommended,
    flags: result.flags,
    hasEmail: scope === 'owner' && Boolean(session.email),
    access: scope,
  };
}

/**
 * Salva o e-mail (com consentimento) e envia o link do resultado.
 * Somente o DONO pode fazer isso — um link compartilhado não consegue trocar o e-mail de recuperação.
 */
export async function saveResultEmail(token: string, rawEmail: string): Promise<void> {
  const session = await findSessionByToken(token);
  if (!session || session.status !== 'completed') throw new HttpError(404, 'not_found', 'Resultado não encontrado.');
  enforceRateLimit(`result-email:session:${session.id}`, 5, HOUR);
  enforceClientRateLimit('result-email', null, { global: 1000, windowMs: HOUR });

  const email = normalizeEmail(emailSchema.parse(rawEmail));
  await db().quizSession.update({ where: { id: session.id }, data: { email, emailConsentAt: new Date() } });
  await sendEmailSafely({ to: email, ...emailTemplates.resultLink(absoluteUrl(`/resultado/${token}`)) });
}

/**
 * Cria um link de compartilhamento SOMENTE LEITURA (quem recebe vê o resultado, mas não pode
 * excluí-lo, trocar o e-mail nem gerar outros links).
 */
export async function createShareLink(token: string): Promise<string> {
  const session = await findSessionByToken(token);
  if (!session || session.status !== 'completed') throw new HttpError(404, 'not_found', 'Resultado não encontrado.');
  enforceRateLimit(`result-share:session:${session.id}`, 10, HOUR);

  const shareToken = generateToken();
  await db().sessionAccessToken.create({
    data: { sessionId: session.id, tokenHash: hashToken(shareToken), source: 'share', scope: 'viewer' },
  });
  return `/resultado/${shareToken}`;
}

/** Direito de eliminação (LGPD): apaga respostas, resultado e tokens de acesso. Somente o dono. */
export async function deleteResult(token: string): Promise<boolean> {
  const session = await findSessionByToken(token);
  if (!session) return false;
  await db().quizSession.delete({ where: { id: session.id } });
  return true;
}

/**
 * Recuperação por e-mail, em duas partes:
 * 1. `prepareRecoveryRequest` valida e aplica os limites (síncrono, antes de responder);
 * 2. `processRecoveryRequest` procura resultados e envia o e-mail — a rota executa esta parte
 *    DEPOIS de responder (`after`), então o tempo de resposta não revela se o e-mail existe.
 * A resposta ao navegador é sempre a mesma, evitando a enumeração de quem fez o quiz.
 */
export function prepareRecoveryRequest(rawEmail: string, ip: string | null): string {
  const email = normalizeEmail(emailSchema.parse(rawEmail));
  enforceRateLimit(`recover-email:${hashToken(email)}`, 3, HOUR);
  enforceClientRateLimit('recover', ip, { perIp: 10, global: 300, windowMs: HOUR });
  return email;
}

export async function requestRecovery(rawEmail: string, ip: string | null): Promise<void> {
  await processRecoveryRequest(prepareRecoveryRequest(rawEmail, ip));
}

export async function processRecoveryRequest(email: string): Promise<void> {
  const hasResult = await db().quizSession.count({ where: { email, status: 'completed' } });
  if (!hasResult) return;

  const token = generateToken();
  await db().recoveryToken.create({
    data: { tokenHash: hashToken(token), email, expiresAt: new Date(Date.now() + RECOVERY_TTL_MS) },
  });
  await sendEmailSafely({ to: email, ...emailTemplates.recovery(absoluteUrl(`/recuperar/${token}`)) });
}

export interface RecoveredResult {
  resultPath: string;
  completedAt: string;
  primaryCategoryName: string | null;
}

/**
 * Consome um link de recuperação (uso único, com expiração) e emite novos links de acesso
 * para os resultados daquele e-mail.
 */
export async function consumeRecovery(token: string): Promise<RecoveredResult[] | null> {
  if (!isValidTokenFormat(token)) return null;
  const record = await db().recoveryToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record) return null;

  // Atualização condicional = atômica: dois cliques simultâneos não usam o mesmo link duas vezes.
  const now = new Date();
  const claimed = await db().recoveryToken.updateMany({
    where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (claimed.count !== 1) return null;

  const sessions = await db().quizSession.findMany({
    where: { email: record.email, status: 'completed' },
    orderBy: { completedAt: 'desc' },
    take: 10,
  });
  const categories = new Map((await db().category.findMany()).map((category) => [category.id, category.name]));

  const recovered: RecoveredResult[] = [];
  for (const session of sessions) {
    const accessToken = generateToken();
    await db().sessionAccessToken.create({
      data: { sessionId: session.id, tokenHash: hashToken(accessToken), source: 'recovery' },
    });
    recovered.push({
      resultPath: `/resultado/${accessToken}`,
      completedAt: (session.completedAt ?? session.updatedAt).toISOString(),
      primaryCategoryName: session.primaryCategoryId ? (categories.get(session.primaryCategoryId) ?? null) : null,
    });
  }
  return recovered;
}
