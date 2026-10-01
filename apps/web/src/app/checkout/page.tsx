import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { quizCookieName } from '@/server/cookies';
import { listCatalog } from '@/server/services/checkout-service';
import { findSessionByToken } from '@/server/services/quiz-service';
import { parseStoredResult } from '@/server/services/result-service';
import { getPricingSettings } from '@/server/settings';

export const metadata: Metadata = { title: 'Finalizar compra', robots: { index: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { modulos } = await searchParams;
  const [catalog, pricing] = await Promise.all([listCatalog(), getPricingSettings()]);
  const available = new Set(catalog.map((module) => module.slug));

  // Módulos indicados no resultado deste navegador (se houver) — pré-selecionados os que a pessoa aceitou o valor.
  const session = await findSessionByToken((await cookies()).get(quizCookieName())?.value);
  const result = session?.status === 'completed' ? parseStoredResult(session.resultJson) : null;
  const moduleSlugById = new Map(catalog.map((module) => [module.id, module.slug]));
  const recommendedSlugs = (result?.recommendedModules ?? [])
    .map((entry) => moduleSlugById.get(entry.moduleId))
    .filter((slug): slug is string => Boolean(slug));

  const requested = (typeof modulos === 'string' ? modulos.split(',') : [])
    .map((slug) => slug.trim())
    .filter((slug) => available.has(slug));
  const preselectedFromResult = (result?.recommendedModules ?? [])
    .filter((entry) => entry.preselected)
    .map((entry) => moduleSlugById.get(entry.moduleId))
    .filter((slug): slug is string => Boolean(slug));
  const initialSlugs = [...new Set(requested.length ? requested : preselectedFromResult)].slice(0, 20);

  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="text-2xl font-bold text-night-900 sm:text-3xl">Finalizar compra</h1>
          <p className="mt-1 text-slate-600">Escolha os módulos do curso e a forma de pagamento.</p>
          <div className="mt-8">
            <CheckoutForm
              catalog={catalog}
              initialSlugs={initialSlugs}
              recommendedSlugs={recommendedSlugs}
              pricing={{
                comboDiscountPercent: pricing.comboDiscountPercent,
                comboMinItems: pricing.comboMinItems,
                maxInstallments: pricing.maxInstallments,
              }}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
