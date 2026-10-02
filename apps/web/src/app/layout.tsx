import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { t } from '@remoa/strings';
import { Bricolage_Grotesque, Instrument_Sans } from 'next/font/google';
import { Providers } from '@/features/shell/providers';
import { themeScript } from '@/features/shell/theme';
import './globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-bricolage', display: 'swap' });
const body = Instrument_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-instrument', display: 'swap' });

export const metadata: Metadata = { title: t('common.appName') };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-canvas font-sans text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
