import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/LoginForm';
import { Logo } from '@/components/site/SiteHeader';
import { getAdminFromToken } from '@/server/auth/admin-auth';
import { adminCookieName } from '@/server/cookies';

export const metadata: Metadata = { title: 'Entrar no painel', robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  const admin = await getAdminFromToken((await cookies()).get(adminCookieName())?.value);
  if (admin) redirect('/admin');

  return (
    <main id="conteudo" className="grid min-h-dvh place-items-center bg-night-900 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <h1 className="text-xl font-bold text-night-900">Painel administrativo</h1>
          <p className="mt-1 mb-5 text-sm text-slate-600">Acesso restrito à equipe.</p>
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-sm text-night-200">
          <Link href="/" className="hover:text-white">← Voltar ao site</Link>
        </p>
      </div>
    </main>
  );
}
