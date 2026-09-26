import 'server-only';
import { buildFunnel, type FunnelStep } from '@relacionamentos/analytics';
import { validateDefinition, type DefinitionIssue } from '@relacionamentos/quiz-engine';
import { db } from '../db';
import { getQuizDefinition } from '../definition';
import { parseAnswers } from './quiz-service';

export interface PriceAcceptance {
  moduleId: string;
  title: string;
  priceCents: number;
  agree: number;
  maybe: number;
  disagree: number;
  total: number;
  /** % de "concordo" entre as respostas. */
  agreeRate: number | null;
  paidOrders: number;
}

/**
 * Aceitação de preço por módulo, a partir das perguntas de fim de etapa das sessões concluídas.
 * Ajuda a calibrar os preços (painel → Preços).
 */
export async function getPriceAcceptance(): Promise<PriceAcceptance[]> {
  const [modules, stages, sessions, sold] = await Promise.all([
    db().bookModule.findMany({ orderBy: [{ position: 'asc' }, { title: 'asc' }] }),
    db().stage.findMany({ where: { offerModuleId: { not: null } }, select: { id: true, offerModuleId: true } }),
    db().quizSession.findMany({
      where: { status: 'completed' },
      select: { answersJson: true },
      orderBy: { completedAt: 'desc' },
      take: 5000,
    }),
    db().orderItem.groupBy({ by: ['moduleId'], where: { order: { status: 'paid' } }, _count: { _all: true } }),
  ]);

  const counts = new Map(modules.map((m) => [m.id, { agree: 0, maybe: 0, disagree: 0 }]));
  for (const session of sessions) {
    const answers = parseAnswers(session.answersJson);
    for (const stage of stages) {
      const response = answers[`price:${stage.id}`]?.[0];
      const bucket = stage.offerModuleId ? counts.get(stage.offerModuleId) : undefined;
      if (bucket && (response === 'agree' || response === 'maybe' || response === 'disagree')) bucket[response] += 1;
    }
  }
  const soldBy = new Map(sold.map((row) => [row.moduleId, row._count._all]));

  return modules.map((module) => {
    const bucket = counts.get(module.id) ?? { agree: 0, maybe: 0, disagree: 0 };
    const total = bucket.agree + bucket.maybe + bucket.disagree;
    return {
      moduleId: module.id,
      title: module.title,
      priceCents: module.priceCents,
      ...bucket,
      total,
      agreeRate: total ? Math.round((bucket.agree / total) * 100) : null,
      paidOrders: soldBy.get(module.id) ?? 0,
    };
  });
}

export interface DashboardData {
  kpis: {
    sessionsStarted: number;
    sessionsCompleted: number;
    completionRate: number | null;
    orders: number;
    paidOrders: number;
    revenueCents: number;
    averageTicketCents: number | null;
    conversionRate: number | null;
  };
  primaryDistribution: { categoryId: string | null; name: string; color: string; count: number }[];
  methods: { method: string; total: number; paid: number }[];
  priceAcceptance: PriceAcceptance[];
  funnel: FunnelStep[];
  consentedEvents: number;
  issues: DefinitionIssue[];
  recentOrders: { id: string; createdAt: Date; status: string; method: string; totalCents: number; items: number }[];
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

export async function getDashboardData(): Promise<DashboardData> {
  const [
    sessionsStarted,
    sessionsCompleted,
    orders,
    paidOrders,
    revenue,
    methods,
    primaryGroups,
    categories,
    recentOrders,
    eventCounts,
    priceAcceptance,
    { definition, issues: loadIssues },
  ] = await Promise.all([
    db().quizSession.count(),
    db().quizSession.count({ where: { status: 'completed' } }),
    db().order.count(),
    db().order.count({ where: { status: 'paid' } }),
    db().order.aggregate({ where: { status: 'paid' }, _sum: { totalCents: true } }),
    db().order.groupBy({ by: ['method', 'status'], _count: { _all: true } }),
    db().quizSession.groupBy({ by: ['primaryCategoryId'], where: { status: 'completed' }, _count: { _all: true } }),
    db().category.findMany(),
    db().order.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { _count: { select: { items: true } } } }),
    db().analyticsEvent.groupBy({ by: ['name', 'sessionId'], _count: { _all: true } }),
    getPriceAcceptance(),
    getQuizDefinition(),
  ]);
  // Sessões (pessoas) que fizeram o teste e depois pagaram algum pedido.
  const convertedSessions = (
    await db().order.findMany({
      where: { status: 'paid', session: { status: 'completed' } },
      distinct: ['sessionId'],
      select: { sessionId: true },
    })
  ).length;

  const revenueCents = revenue._sum.totalCents ?? 0;
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const methodMap = new Map<string, { total: number; paid: number }>();
  for (const row of methods) {
    const entry = methodMap.get(row.method) ?? { total: 0, paid: 0 };
    entry.total += row._count._all;
    if (row.status === 'paid') entry.paid += row._count._all;
    methodMap.set(row.method, entry);
  }

  // Funil por pessoa: cada sessão conta uma vez por etapa (eventos sem sessão contam individualmente).
  const eventMap: Record<string, number> = {};
  for (const row of eventCounts) {
    eventMap[row.name] = (eventMap[row.name] ?? 0) + (row.sessionId ? 1 : row._count._all);
  }
  const consentedEvents = eventCounts.reduce((sum, row) => sum + row._count._all, 0);

  const issues: DefinitionIssue[] = [
    ...loadIssues.map((issue) => ({ level: 'error' as const, code: `load_${issue.type}`, message: issue.message })),
    ...validateDefinition(definition),
  ];

  return {
    kpis: {
      sessionsStarted,
      sessionsCompleted,
      completionRate: pct(sessionsCompleted, sessionsStarted),
      orders,
      paidOrders,
      revenueCents,
      averageTicketCents: paidOrders ? Math.round(revenueCents / paidOrders) : null,
      conversionRate: pct(convertedSessions, sessionsCompleted),
    },
    primaryDistribution: primaryGroups
      .map((row) => {
        const category = row.primaryCategoryId ? categoryById.get(row.primaryCategoryId) : undefined;
        return {
          categoryId: row.primaryCategoryId,
          name: category?.name ?? (row.primaryCategoryId ? 'Categoria removida' : 'Nenhum tema em destaque'),
          color: category?.color ?? '#94a3b8',
          count: row._count._all,
        };
      })
      .sort((a, b) => b.count - a.count),
    methods: [...methodMap.entries()].map(([method, value]) => ({ method, ...value })),
    priceAcceptance,
    funnel: buildFunnel({
      quiz_started: eventMap.quiz_started ?? 0,
      quiz_completed: eventMap.quiz_completed ?? 0,
      checkout_viewed: eventMap.checkout_viewed ?? 0,
      order_created: eventMap.order_created ?? 0,
      payment_approved: eventMap.payment_approved ?? 0,
    }),
    consentedEvents,
    issues,
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      method: order.method,
      totalCents: order.totalCents,
      items: order._count.items,
    })),
  };
}
