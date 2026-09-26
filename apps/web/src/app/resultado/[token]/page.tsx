import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SAFETY_FLAG } from '@relacionamentos/quiz-engine';
import { SafeMarkdown } from '@/components/SafeMarkdown';
import { PreviewDetails } from '@/components/result/PreviewDetails';
import {
  DeleteResultButton,
  EmailResultForm,
  ForgetBrowserButton,
  QuickExitButton,
  ShareLinkButton,
} from '@/components/result/ResultActions';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SupportResources } from '@/components/site/SupportResources';
import { ButtonLink } from '@/components/ui/Button';
import { Alert, Badge, ProgressBar } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import type { RecommendationReasonDTO, ThemeDTO } from '@/lib/dto';
import { formatBRL, formatDateTime } from '@/lib/format';
import { getResultView } from '@/server/services/result-service';

export const metadata: Metadata = { title: 'Seu resultado', robots: { index: false, follow: false } };

const REASON_LABELS: Record<RecommendationReasonDTO, string> = {
  primary: 'Tema em destaque',
  secondary: 'Também apareceu',
  rule: 'Indicado pelas suas respostas',
  price_agreed: 'Você concordou com o valor',
  explore: 'Para explorar',
};

function intensity(score: number): string {
  if (score >= 60) return 'Em destaque';
  if (score >= 35) return 'Presente';
  if (score > 0) return 'Pouco presente';
  return 'Não apareceu';
}

export default async function ResultPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getResultView(token);
  if (!result) notFound();

  const safety = result.flags.includes(SAFETY_FLAG);
  const isOwner = result.access === 'owner';
  const preselected = result.modules.filter((module) => module.preselected).map((module) => module.slug);
  const allSlugs = result.modules.map((module) => module.slug);
  const checkoutSlugs = preselected.length ? preselected : allSlugs.slice(0, 1);

  return (
    <>
      {safety ? <QuickExitButton /> : null}
      <SiteHeader />
      <main id="conteudo" className="bg-slate-50">
        {!isOwner ? (
          <div className="mx-auto max-w-4xl px-4 pt-6">
            <Alert tone="info" title="Resultado compartilhado">
              Você está vendo um resultado que alguém compartilhou com você (somente leitura).
            </Alert>
          </div>
        ) : null}
        <section className="bg-night-900 text-white">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
            <p className="text-sm text-night-300">Resultado gerado em {formatDateTime(result.completedAt)}</p>
            {result.primary ? (
              <>
                <h1 className="mt-3 text-2xl leading-tight font-bold sm:text-4xl">
                  O tema que mais apareceu nas suas respostas foi{' '}
                  <span className="text-brand-300">{result.primary.name}</span>
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-night-100 sm:text-lg">{result.primary.explanation}</p>
              </>
            ) : (
              <>
                <h1 className="mt-3 text-2xl leading-tight font-bold sm:text-4xl">Nenhum tema se destacou fortemente</h1>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-night-100 sm:text-lg">
                  Suas respostas não apontaram um tema com intensidade maior que os outros. Isso pode indicar uma fase mais
                  tranquila — e também é um bom momento para cuidar do que já funciona bem.
                </p>
              </>
            )}
            <p className="mt-6 flex items-start gap-2 rounded-xl bg-white/5 p-4 text-sm text-night-200">
              <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" />
              <span>
                Este resultado <strong className="text-white">não é um diagnóstico</strong>. Ele mostra quais temas
                apareceram mais nas suas respostas, para ajudar você a refletir e escolher por onde começar.
              </span>
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
          {safety ? <SupportResources emphasis /> : null}

          <section aria-labelledby="pontuacoes" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <h2 id="pontuacoes" className="text-xl font-bold text-night-900">Como cada tema apareceu</h2>
            <p className="mt-1 text-sm text-slate-600">De 0 a 100: o quanto as respostas relacionadas a cada tema apontaram para ele.</p>
            <ul className="mt-6 space-y-5">
              {result.scores.map((theme: ThemeDTO) => (
                <li key={theme.categoryId}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-slate-900">{theme.name}</span>
                    <span className="text-sm text-slate-600">
                      {intensity(theme.score)} · <strong className="text-slate-900">{theme.score}</strong>
                    </span>
                  </div>
                  <ProgressBar
                    value={theme.score}
                    label={theme.name}
                    valueText={`${theme.score} de 100 — ${intensity(theme.score)}`}
                    className="mt-2 h-2.5"
                    barClassName=""
                    barColor={theme.color}
                  />
                  <p className="mt-1 text-xs text-slate-500">{theme.shortDescription}</p>
                </li>
              ))}
            </ul>
          </section>

          {result.secondary.length ? (
            <section aria-labelledby="secundarios">
              <h2 id="secundarios" className="text-xl font-bold text-night-900">Também apareceram nas suas respostas</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {result.secondary.map((theme) => (
                  <article key={theme.categoryId} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                    <span className="block h-1.5 w-10 rounded-full" style={{ backgroundColor: theme.color }} />
                    <h3 className="mt-3 font-semibold text-slate-900">{theme.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{theme.explanation}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section aria-labelledby="modulos">
            <h2 id="modulos" className="text-xl font-bold text-night-900">Por onde começar no livro “Entre Nós”</h2>
            {result.modules.length ? (
              <>
                <p className="mt-1 text-sm text-slate-600">
                  Seções escolhidas a partir dos seus temas e das suas respostas sobre o valor de cada uma. Leia a prévia antes de decidir.
                </p>
                <div className="mt-4 space-y-4">
                  {result.modules.map((module) => (
                    <article key={module.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
                      <div className="flex flex-wrap gap-2">
                        <Badge>{REASON_LABELS[module.reason]}</Badge>
                        {module.categoryName && module.reason !== 'primary' ? (
                          <Badge className="bg-slate-100 text-slate-700">{module.categoryName}</Badge>
                        ) : null}
                        {module.priceAgreement === 'agree' && module.reason !== 'price_agreed' ? (
                          <Badge className="bg-green-100 text-green-800">
                            <Icon name="check" className="h-3 w-3" /> Você concordou com o valor
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-4 flex gap-4">
                        <span className="text-4xl" aria-hidden="true">{module.coverEmoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-500">{module.subtitle}</p>
                          <h3 className="text-lg font-bold text-night-900">{module.title}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-slate-600">{module.description}</p>
                        </div>
                      </div>
                      <PreviewDetails moduleId={module.id}>
                        <SafeMarkdown source={module.previewContent} />
                      </PreviewDetails>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <span className="font-display text-2xl font-extrabold text-night-900">{formatBRL(module.priceCents)}</span>
                        <ButtonLink href={`/checkout?modulos=${module.slug}`} variant={safety ? 'secondary' : 'primary'}>
                          Quero esta seção <Icon name="arrowRight" className="h-4 w-4" />
                        </ButtonLink>
                      </div>
                    </article>
                  ))}
                </div>
                {allSlugs.length > 1 ? (
                  <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl bg-brand-50 p-5 ring-1 ring-brand-200 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-brand-900">
                      Prefere levar mais de uma seção? No checkout você escolhe quais e ganha desconto a partir de 2.
                    </p>
                    <ButtonLink href={`/checkout?modulos=${checkoutSlugs.join(',')}`} variant="primary" size="sm">
                      Montar meu pacote
                    </ButtonLink>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                Nenhuma seção foi indicada especificamente para você agora. Se quiser, conheça{' '}
                <Link href="/#livro" className="font-medium text-brand-700 underline">todas as seções do livro</Link>.
              </p>
            )}
          </section>

          {!safety ? <SupportResources /> : null}

          {isOwner ? (
            <section aria-labelledby="guardar" className="grid gap-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 md:grid-cols-2">
              <div>
                <h2 id="guardar" className="text-lg font-bold text-night-900">Guarde seu resultado</h2>
                <p className="mt-1 mb-4 text-sm text-slate-600">
                  O endereço desta página é o seu <strong>link pessoal</strong>: ele permite excluir o resultado e trocar o
                  e-mail, então não o compartilhe. Para mostrar a alguém, use “Compartilhar (somente leitura)”.
                </p>
                <EmailResultForm token={token} hasEmail={result.hasEmail} />
              </div>
              <div className="flex flex-col gap-4 md:border-l md:border-slate-200 md:pl-6">
                <h2 className="text-lg font-bold text-night-900">Outras opções</h2>
                <ShareLinkButton token={token} />
                <ButtonLink href="/quiz?novo=1" variant="secondary" size="sm">
                  Refazer o teste
                </ButtonLink>
                <div className="mt-auto space-y-3 border-t border-slate-200 pt-4">
                  <p className="text-xs text-slate-500">
                    Seus dados, sua escolha (LGPD). Em aparelho compartilhado, remova o acesso deste navegador.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <ForgetBrowserButton />
                    <DeleteResultButton token={token} />
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <p className="text-center text-sm text-slate-600">
              Quer descobrir os temas do seu relacionamento?{' '}
              <Link href="/quiz?novo=1" className="font-medium text-brand-700 underline">
                Faça o teste gratuito
              </Link>
              .
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
