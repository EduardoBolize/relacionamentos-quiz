import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { ConsentBanner } from '@/components/site/ConsentBanner';
import { BRAND } from '@/lib/brand';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-poppins', display: 'swap' });

export const metadata: Metadata = {
  title: { default: `${BRAND.name} — descubra o seu módulo ideal`, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
  applicationName: BRAND.name,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#150626',
};

// Todas as páginas são dinâmicas: o CSP usa um nonce novo a cada requisição.
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: ReactNode }) {
  await headers();
  return (
    <html lang="pt-BR" className={`${inter.variable} ${poppins.variable}`}>
      <body className="min-h-dvh">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900"
        >
          Pular para o conteúdo
        </a>
        {children}
        <ConsentBanner />
      </body>
    </html>
  );
}
