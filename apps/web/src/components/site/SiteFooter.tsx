import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { Logo } from './SiteHeader';

export function SiteFooter() {
  return (
    <footer className="bg-night-950 text-night-200">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 text-sm leading-relaxed">
            {BRAND.tagline}. Conteúdo educativo: o quiz não é diagnóstico e não substitui acompanhamento profissional.
          </p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-col gap-2 text-sm">
          <Link href="/quiz" className="hover:text-white">Fazer o quiz</Link>
          <Link href="/#modulos" className="hover:text-white">Os 8 módulos</Link>
          <Link href="/recuperar" className="hover:text-white">Recuperar meu resultado</Link>
          <Link href="/privacidade" className="hover:text-white">Privacidade e dados (LGPD)</Link>
        </nav>
        <div className="text-sm">
          <p className="font-semibold text-white">Precisa de apoio agora?</p>
          <p className="mt-2">Central de Atendimento à Mulher — 180</p>
          <p>CVV — 188 (24 h, gratuito)</p>
          <p>Emergência — 190</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-night-300">
        © {BRAND.name} · método de {BRAND.author}
        <span className="mx-2">·</span>
        <Link href="/admin" className="hover:text-white">Área administrativa</Link>
      </div>
    </footer>
  );
}
