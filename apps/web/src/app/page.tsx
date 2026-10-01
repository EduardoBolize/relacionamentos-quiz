import Link from 'next/link';
import { BuyLink } from '@/components/course/BuyLink';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SupportResources } from '@/components/site/SupportResources';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { BRAND } from '@/lib/brand';
import { formatBRL } from '@/lib/format';
import { db } from '@/server/db';
import { getOfferInfo, getObjectionAnswers, installmentText } from '@/server/offer';

const MOMENTS = [
  { emoji: '💘', title: 'Solteira ou de olho em alguém', text: 'Despertar o interesse de quem você quer sendo você mesma, do primeiro papo ao primeiro encontro.' },
  { emoji: '💍', title: 'Namorando ou casada', text: 'Manter a chama acesa, atravessar as fases da relação e construir uma parceria de verdade.' },
  { emoji: '🩹', title: 'Quando a relação balança', text: 'Entender o problema real, conversar sem brigar e evitar o término.' },
  { emoji: '🦋', title: 'Depois do término', text: 'Atravessar a dor, decidir se vale reconquistar e, se valer, reaproximar-se com leveza.' },
];

const STEPS = [
  {
    title: 'Responda ao quiz',
    text: 'Uma pergunta por vez, em cerca de 4 minutos. O quiz se adapta ao seu momento e pula o que não faz sentido para você.',
  },
  {
    title: 'Descubra o seu módulo ideal',
    text: 'Você recebe uma explicação cuidadosa, sem rótulos nem diagnóstico, e a indicação de por onde começar, com prévia gratuita.',
  },
  {
    title: 'Aprenda no seu ritmo',
    text: 'Cada módulo tem 3 aulas em vídeo de cerca de 1 minuto e um texto direto ao ponto, com exercícios para praticar no mesmo dia.',
  },
];

const SITE_FAQ = [
  {
    q: 'O quiz é gratuito? É um diagnóstico?',
    a: 'O quiz e o resultado são gratuitos. Ele não é diagnóstico: aponta os temas que mais apareceram nas suas respostas para ajudar você a escolher por onde começar. Não substitui terapia ou acompanhamento profissional.',
  },
  {
    q: 'Preciso me cadastrar?',
    a: 'Não. Seu progresso fica salvo neste navegador. Se quiser, ao final você pode informar um e-mail para receber o link do resultado.',
  },
  {
    q: 'O que acontece com as minhas respostas?',
    a: 'Elas são usadas apenas para gerar o seu resultado. Você pode excluí-lo a qualquer momento na própria página dele. Veja a política de privacidade.',
  },
];

export default async function HomePage() {
  const [modules, videoCount, offer] = await Promise.all([
    db().bookModule.findMany({
      where: { active: true },
      orderBy: [{ position: 'asc' }, { title: 'asc' }],
      include: { _count: { select: { videos: { where: { active: true } } } } },
    }),
    db().moduleVideo.count({ where: { active: true, module: { active: true } } }),
    getOfferInfo(),
  ]);
  const objections = await getObjectionAnswers(offer);
  const faq = [...objections.map((item) => ({ q: item.title, a: item.answer })), ...SITE_FAQ];
  const fullPriceDiffers = offer.courseTotalCents < offer.courseSubtotalCents;
  const installments = installmentText(offer);

  return (
    <>
      <SiteHeader />
      <main id="conteudo">
        {/* Hero */}
        <section className="relative overflow-hidden bg-night-900 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(224,69,123,0.35),transparent_45%),radial-gradient(circle_at_80%_60%,rgba(86,55,122,0.6),transparent_50%)]" />
          <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
            <p className="text-sm font-semibold tracking-wide text-brand-300 uppercase">{BRAND.name}</p>
            <h1 className="mt-4 text-3xl leading-tight font-extrabold uppercase sm:text-5xl">
              Descubra o módulo ideal <br className="hidden sm:block" /> para a sua história de amor
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-night-100 sm:text-lg">
              {BRAND.tagline}. Faça o quiz gratuito e saiba por onde começar, seja para conquistar, manter ou reconquistar
              um amor.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/quiz" variant="onDark" size="lg" className="uppercase tracking-wide">
                Descobrir meu módulo ideal
                <Icon name="arrowRight" />
              </ButtonLink>
              <ButtonLink href="/#modulos" variant="outlineDark" size="lg">
                Ver os módulos
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
        <section aria-label="O curso em números" className="border-b border-slate-200 bg-white">
          <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-10 text-center sm:grid-cols-4">
            {[
              [String(offer.moduleCount), 'módulos'],
              [String(videoCount), 'aulas de ~1 minuto'],
              [formatBRL(offer.modulePriceCents), 'por módulo'],
              ['~4 min', 'para fazer o quiz'],
            ].map(([value, label]) => (
              <div key={label} className="flex flex-col">
                <dt className="order-2 text-sm text-slate-600">{label}</dt>
                <dd className="order-1 font-display text-3xl font-extrabold text-brand-600">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Para quem é */}
        <section className="py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-2xl font-bold text-night-900 sm:text-3xl">Para qualquer momento da sua vida amorosa</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              Seja o seu crush, o namorado, o marido ou até o ex: o quiz identifica o seu momento e indica o módulo certo.
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {MOMENTS.map((moment) => (
                <li key={moment.title} className="flex gap-4 rounded-2xl border border-slate-200 p-5">
                  <span className="text-3xl" aria-hidden="true">{moment.emoji}</span>
                  <div>
                    <h3 className="font-semibold text-night-900">{moment.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{moment.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="scroll-mt-20 bg-slate-50 py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-2xl font-bold text-night-900 sm:text-3xl">Como funciona</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              Primeiro, você cuida de si mesma, porque estar bem emocionalmente é essencial. Depois, aprende a se conectar de
              forma natural, com comunicação e atitudes que despertam um interesse genuíno.
            </p>
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

        {/* Módulos */}
        <section id="modulos" className="scroll-mt-20 bg-night-900 py-16 text-white">
          <div className="mx-auto max-w-6xl px-4">
            <p className="text-center text-sm font-semibold tracking-wide text-brand-300 uppercase">O curso</p>
            <h2 className="mt-2 text-center text-2xl font-bold sm:text-3xl">Os {offer.moduleCount} módulos do {BRAND.name}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-night-200">
              Cada módulo traz aulas curtas em vídeo e um texto prático. Comece só pelo que faz sentido para você agora.
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {modules.map((module) => (
                <li key={module.id} className="flex flex-col rounded-2xl bg-night-800 p-5 ring-1 ring-white/10">
                  <span className="text-3xl" aria-hidden="true">{module.coverEmoji}</span>
                  <p className="mt-3 text-xs font-medium text-night-300">{module.subtitle.split('·')[0]?.trim()}</p>
                  <h3 className="mt-1 text-lg font-semibold">{module.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-night-200">{module.description}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-night-300">
                    <Icon name="video" className="h-3.5 w-3.5" /> {module._count.videos} aulas + texto
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-display text-lg font-bold">{formatBRL(module.priceCents)}</span>
                    <Link href={`/modulos/${module.slug}`} className="text-sm font-semibold text-brand-300 hover:text-brand-200">
                      Ver módulo <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            {offer.moduleCount > 1 ? (
              <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-4 rounded-2xl bg-white/5 p-6 text-center ring-1 ring-brand-400/40 sm:p-8">
                <p className="text-sm font-semibold tracking-wide text-brand-300 uppercase">Curso completo</p>
                <p className="font-display text-2xl font-bold sm:text-3xl">
                  {fullPriceDiffers ? (
                    <span className="mr-2 text-lg text-night-300 line-through">{formatBRL(offer.courseSubtotalCents)}</span>
                  ) : null}
                  {offer.moduleCount} módulos por {formatBRL(offer.courseTotalCents)}
                </p>
                {installments ? <p className="text-night-200">ou {installments}</p> : null}
                <BuyLink href={offer.fullCourseHref} external={offer.fullCourseExternal} variant="onDark" size="lg">
                  Quero o curso completo
                </BuyLink>
                {offer.guaranteeDays ? (
                  <p className="flex items-center gap-1.5 text-sm text-night-200">
                    <Icon name="shield" className="h-4 w-4 text-brand-300" /> Garantia de {offer.guaranteeDays} dias: não gostou, devolvemos
                    o seu dinheiro.
                  </p>
                ) : null}
              </div>
            ) : null}
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
                O quiz é uma ferramenta de reflexão: ele <strong>não é um diagnóstico</strong> e não substitui o acompanhamento de
                psicólogos(as) ou terapeutas. E um aviso que o próprio método faz questão de dar: se a relação envolve medo,
                humilhações, ameaças ou violência, a prioridade é a sua segurança. Procure ajuda especializada.
              </p>
            </div>
            <SupportResources />
          </div>
        </section>

        {/* Dúvidas */}
        <section id="duvidas" className="scroll-mt-20 bg-slate-50 py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-center text-2xl font-bold text-night-900 sm:text-3xl">Dúvidas frequentes</h2>
            <div className="mt-8 divide-y divide-slate-200 rounded-2xl bg-white ring-1 ring-slate-200">
              {faq.map((item) => (
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
                Descobrir meu módulo ideal
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
