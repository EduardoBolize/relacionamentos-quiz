import Link from 'next/link';
import { buttonClasses } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { BRAND } from '@/lib/brand';

export function Logo({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <span className={`flex shrink-0 items-center gap-2 font-display text-lg font-bold tracking-tight whitespace-nowrap ${tone === 'light' ? 'text-white' : 'text-night-900'}`}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500 text-white">
        <Icon name="heart" className="h-4 w-4" />
      </span>
      {BRAND.name}
    </span>
  );
}

/** Cabeçalho escuro, no espírito da AUVP (marca à esquerda, navegação e CTA à direita). */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-night-950/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label={`${BRAND.name} — página inicial`}>
          <Logo />
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-6 text-sm text-night-200 md:flex">
          <Link href="/#como-funciona" className="hover:text-white">
            Como funciona
          </Link>
          <Link href="/#modulos" className="hover:text-white">
            Módulos
          </Link>
          <Link href="/#duvidas" className="hover:text-white">
            Dúvidas
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <Link href="/resultado" className={buttonClasses('outlineDark', 'sm', 'whitespace-nowrap')}>
              Meu resultado
            </Link>
          </div>
          <Link href="/quiz" className={buttonClasses('onDark', 'sm', 'whitespace-nowrap')}>
            Fazer o quiz
          </Link>
        </div>
      </div>
    </header>
  );
}
