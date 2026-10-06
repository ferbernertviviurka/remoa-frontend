import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { t } from '@remoa/strings';
import { Bricolage_Grotesque, Instrument_Sans } from 'next/font/google';
import { DevEventDiagnostics } from '@/features/shell/dev-event-diagnostics';
import { Providers } from '@/features/shell/providers';
import { themeScript } from '@/features/shell/theme';
import { googleSiteVerification } from '@/lib/env/legal';
import { siteUrl } from '@/lib/seo/site';
import './globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-bricolage', display: 'swap', preload: false });
const body = Instrument_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-instrument', display: 'swap' });

// G11: metadataBase here so every route (not only the landing) resolves OG/canonical URLs against the real domain (Q-015).
// F27 FR-38: optional Search Console token (the DNS TXT record is the preferred check, docs/runbooks/seo.md).
const google = googleSiteVerification();
export const metadata: Metadata = { metadataBase: new URL(siteUrl), title: t('common.appName'), ...(google ? { verification: { google } } : {}) };
// viewport-fit=cover: sem isso env(safe-area-inset-*) vale 0 e a bottom-nav fica sob a barra home do iPhone.
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
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
