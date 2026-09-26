import Link from 'next/link';
import { Logo } from './SiteHeader';

export function SiteFooter() {
  return (
    <footer className="bg-night-950 text-night-200">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 text-sm leading-relaxed">
            Conteúdo educativo para relações mais leves. O quiz não é diagnóstico e não substitui acompanhamento profissional.
          </p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-col gap-2 text-sm">
          <Link href="/quiz" className="hover:text-white">Fazer o teste</Link>
          <Link href="/recuperar" className="hover:text-white">Recuperar meu resultado</Link>
          <Link href="/privacidade" className="hover:text-white">Privacidade e dados (LGPD)</Link>
        </nav>
        <div className="text-sm">
          <p className="font-semibold text-white">Precisa de apoio agora?</p>
          <p className="mt-2">CVV — 188 (24 h, gratuito)</p>
          <p>Central de Atendimento à Mulher — 180</p>
          <p>Emergência — 190</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-night-300">
        Projeto de demonstração · livro fictício “Entre Nós” · pagamentos simulados
        <span className="mx-2">·</span>
        <Link href="/admin" className="hover:text-white">Área administrativa</Link>
      </div>
    </footer>
  );
}
