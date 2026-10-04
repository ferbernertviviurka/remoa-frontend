import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { t } from '@remoa/strings';
import { Bricolage_Grotesque, Instrument_Sans } from 'next/font/google';
import { DevEventDiagnostics } from '@/features/shell/dev-event-diagnostics';
import { Providers } from '@/features/shell/providers';
import { themeScript } from '@/features/shell/theme';
import { siteUrl } from '@/lib/seo/site';
import './globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-bricolage', display: 'swap' });
const body = Instrument_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-instrument', display: 'swap' });

// G11: metadataBase here so every route (not only the landing) resolves OG/canonical URLs against the real domain (Q-015).
export const metadata: Metadata = { metadataBase: new URL(siteUrl), title: t('common.appName') };
// viewport-fit=cover: sem isso env(safe-area-inset-*) vale 0 e a bottom-nav fica sob a barra home do iPhone.
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const motion = (await cookies()).get('remoa-motion')?.value; // F13 FR-14: reduced | full | absent (system)
  return (
    <html lang="pt-BR" data-motion={motion === 'reduced' || motion === 'full' ? motion : undefined} className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-canvas font-sans text-ink">
        <Providers closeLabel={t('common.close')} viewportLabel={t('common.notifications')}>{children}</Providers>
        {process.env.NODE_ENV === 'production' ? null : <DevEventDiagnostics />}
      </body>
    </html>
  );
}
