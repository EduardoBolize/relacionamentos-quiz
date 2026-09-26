import Link from 'next/link';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SupportResources } from '@/components/site/SupportResources';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatBRL } from '@/lib/format';
import { db } from '@/server/db';
import { getQuizDefinition } from '@/server/definition';

const STEPS = [
  {
    title: 'Responda com sinceridade',
    text: 'Uma pergunta por vez. O quiz se adapta às suas respostas e pula o que não faz sentido para o seu momento.',
  },
  {
    title: 'Veja seus temas em destaque',
    text: 'Você recebe uma pontuação por tema e explicações cuidadosas — sem rótulos e sem diagnóstico.',
  },
  {
    title: 'Aprofunde com o livro',
    text: 'Indicamos a seção do livro “Entre Nós” mais relevante para você, com prévia gratuita antes de qualquer compra.',
  },
];

const FAQ = [
  {
    q: 'O teste é gratuito?',
    a: 'Sim. O quiz e o resultado são gratuitos. As seções do livro recomendadas são opcionais e você vê uma prévia antes de decidir.',
  },
  {
    q: 'O resultado é um diagnóstico?',
    a: 'Não. O quiz aponta os temas que mais apareceram nas suas respostas para ajudar na reflexão. Ele não substitui terapia de casal, psicoterapia ou qualquer acompanhamento profissional.',
  },
  {
    q: 'Preciso me cadastrar?',
    a: 'Não. Seu progresso fica salvo neste navegador. Se quiser, ao final você pode informar um e-mail para receber o link do resultado.',
  },
  {
    q: 'O que acontece com as minhas respostas?',
    a: 'Elas são usadas apenas para gerar o seu resultado. Você pode excluir o resultado a qualquer momento na própria página dele. Veja a política de privacidade.',
  },
  {
    q: 'Como recupero o meu resultado?',
    a: 'Pelo link da página de resultado ou, se você cadastrou um e-mail, pela página “Recuperar meu resultado”.',
  },
  {
    q: 'Quais formas de pagamento são aceitas?',
    a: 'Pix, boleto e cartão de crédito (em até 3x sem juros). Nesta versão de demonstração, os pagamentos são simulados.',
  },
];

export default async function HomePage() {
  const [{ definition }, modules] = await Promise.all([
    getQuizDefinition(),
    db().bookModule.findMany({ where: { active: true }, orderBy: [{ position: 'asc' }, { title: 'asc' }] }),
  ]);
  const questionCount = definition.stages.reduce((sum, stage) => sum + stage.questions.length, 0);

  return (
    <>
      <SiteHeader />
      <main id="conteudo">
        {/* Hero */}
        <section className="relative overflow-hidden bg-night-900 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(224,69,123,0.35),transparent_45%),radial-gradient(circle_at_80%_60%,rgba(86,55,122,0.6),transparent_50%)]" />
          <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
            <p className="text-sm font-semibold tracking-wide text-brand-300 uppercase">Autoconhecimento para relações mais leves</p>
            <h1 className="mt-4 text-3xl leading-tight font-extrabold uppercase sm:text-5xl">
              Entenda o que está pesando <br className="hidden sm:block" /> no seu relacionamento
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-night-100 sm:text-lg">
              Um teste gratuito de cerca de 5 minutos que aponta os temas que mais aparecem nas suas respostas — e mostra
              por onde começar.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/quiz" variant="onDark" size="lg" className="uppercase tracking-wide">
                Faça sua análise gratuita
                <Icon name="arrowRight" />
              </ButtonLink>
              <ButtonLink href="/#como-funciona" variant="outlineDark" size="lg">
                Como funciona
              </ButtonLink>
            </div>
            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-night-200">
              <span className="flex items-center gap-1.5"><Icon name="check" className="h-4 w-4" /> Sem cadastro</span>
              <span className="flex items-center gap-1.5"><Icon name="check" className="h-4 w-4" /> Uma pergunta por vez</span>
              <span className="flex items-center gap-1.5"><Icon name="check" className="h-4 w-4" /> Resultado na hora</span>
            </p>
          </div>
        </section>

        {/* Números */}
        <section aria-label="O teste em números" className="border-b border-slate-200 bg-white">
          <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-10 text-center sm:grid-cols-4">
            {[
              [String(definition.stages.length), 'etapas'],
              [String(questionCount), 'perguntas adaptativas'],
              [String(definition.categories.length), 'temas analisados'],
              ['~5 min', 'para concluir'],
            ].map(([value, label]) => (
              <div key={label} className="flex flex-col">
                <dt className="order-2 text-sm text-slate-600">{label}</dt>
                <dd className="order-1 font-display text-3xl font-extrabold text-brand-600">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="scroll-mt-20 bg-slate-50 py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-2xl font-bold text-night-900 sm:text-3xl">Como funciona</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 font-display font-bold text-brand-700">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-night-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Temas */}
        <section className="py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-2xl font-bold text-night-900 sm:text-3xl">Os temas que o teste observa</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              Nenhum tema é “bom” ou “ruim”. O objetivo é mostrar onde vale a pena colocar atenção agora.
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {definition.categories.map((category) => (
                <li key={category.id} className="rounded-2xl border border-slate-200 p-5">
                  <span className="block h-1.5 w-12 rounded-full" style={{ backgroundColor: category.color }} />
                  <h3 className="mt-3 font-semibold text-night-900">{category.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{category.shortDescription}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Livro */}
        <section id="livro" className="scroll-mt-20 bg-night-900 py-16 text-white">
          <div className="mx-auto max-w-5xl px-4">
            <p className="text-center text-sm font-semibold tracking-wide text-brand-300 uppercase">O livro</p>
            <h2 className="mt-2 text-center text-2xl font-bold sm:text-3xl">Entre Nós — guia prático para relações mais leves</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-night-200">
              Cada seção aprofunda um tema do teste, com exercícios práticos. Você pode ler a prévia de qualquer uma.
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((module) => (
                <li key={module.id} className="flex flex-col rounded-2xl bg-night-800 p-5 ring-1 ring-white/10">
                  <span className="text-3xl" aria-hidden="true">{module.coverEmoji}</span>
                  <p className="mt-3 text-xs font-medium text-night-300">{module.subtitle}</p>
                  <h3 className="mt-1 text-lg font-semibold">{module.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-night-200">{module.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-display text-lg font-bold">{formatBRL(module.priceCents)}</span>
                    <Link href={`/modulos/${module.slug}`} className="text-sm font-semibold text-brand-300 hover:text-brand-200">
                      Ler prévia <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Aviso */}
        <section className="py-16">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-6">
              <h2 className="flex items-center gap-2 text-xl font-bold text-night-900">
                <Icon name="info" className="h-6 w-6 text-brand-600" /> Importante
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                Este teste é uma ferramenta de reflexão. Ele <strong>não é um diagnóstico</strong> e não substitui o
                acompanhamento de psicólogos(as) ou terapeutas de casal. Se o relacionamento envolve medo, ameaças ou
                violência, procure ajuda especializada.
              </p>
            </div>
            <SupportResources />
          </div>
        </section>

        {/* FAQ */}
        <section id="duvidas" className="scroll-mt-20 bg-slate-50 py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-center text-2xl font-bold text-night-900 sm:text-3xl">Dúvidas frequentes</h2>
            <div className="mt-8 divide-y divide-slate-200 rounded-2xl bg-white ring-1 ring-slate-200">
              {FAQ.map((item) => (
                <details key={item.q} className="group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-night-900">
                    {item.q}
                    <Icon name="chevronDown" className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
                </details>
              ))}
            </div>
            <div className="mt-10 text-center">
              <ButtonLink href="/quiz" size="lg" className="uppercase tracking-wide">
                Começar minha análise
                <Icon name="arrowRight" />
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
