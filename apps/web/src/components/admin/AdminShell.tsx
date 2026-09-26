'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Logo } from '@/components/site/SiteHeader';
import { Icon } from '@/components/ui/Icon';
import { apiFetch } from '@/lib/api-client';

const NAV = [
  { href: '/admin', label: 'Painel' },
  { href: '/admin/categorias', label: 'Categorias' },
  { href: '/admin/etapas', label: 'Etapas' },
  { href: '/admin/perguntas', label: 'Perguntas e pesos' },
  { href: '/admin/regras', label: 'Regras' },
  { href: '/admin/modulos', label: 'Módulos do livro' },
  { href: '/admin/precos', label: 'Preços' },
  { href: '/admin/configuracoes', label: 'Configurações' },
  { href: '/admin/pedidos', label: 'Pedidos' },
  { href: '/admin/emails', label: 'E-mails (simulação)' },
  { href: '/admin/auditoria', label: 'Auditoria' },
];

export function AdminShell({ adminName, children }: { adminName: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  const logout = async () => {
    setLeaving(true);
    try {
      await apiFetch('/api/admin/auth/logout', { body: {} });
    } finally {
      router.push('/admin/login');
      router.refresh();
    }
  };

  return (
    <div className="min-h-dvh bg-slate-100 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="bg-night-950 text-night-100 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/admin" aria-label="Painel administrativo">
            <Logo />
          </Link>
          <span className="rounded bg-brand-500/20 px-2 py-0.5 text-xs font-semibold text-brand-200">admin</span>
        </div>
        <nav aria-label="Painel administrativo" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                isActive(item.href) ? 'bg-brand-600 font-semibold text-white' : 'hover:bg-white/10'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <Link href="/" target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
            Ver o site <Icon name="external" className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">Olá, {adminName}</span>
            <button
              type="button"
              onClick={logout}
              disabled={leaving}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Icon name="logout" className="h-4 w-4" /> Sair
            </button>
          </div>
        </header>
        <main id="conteudo" className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
