import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdminPage } from '@/server/auth/admin-auth';

export const metadata: Metadata = {
  title: { default: 'Painel', template: '%s · Painel Entre Nós' },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Cada página também valida a sessão (layouts não são re-renderizados em toda navegação).
  const admin = await requireAdminPage();
  return <AdminShell adminName={admin.name}>{children}</AdminShell>;
}
