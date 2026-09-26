import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="font-display text-6xl font-extrabold text-brand-600">404</p>
        <h1 className="mt-4 text-2xl font-bold text-night-900">Página não encontrada</h1>
        <p className="mt-2 text-slate-600">
          O link pode ter expirado, sido excluído ou digitado incorretamente. Links de resultados e pedidos são pessoais.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/">Página inicial</ButtonLink>
          <ButtonLink href="/recuperar" variant="secondary">
            Recuperar meu resultado
          </ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
