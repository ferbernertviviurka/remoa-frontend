import type { ReactNode } from 'react';
import { Inter, Manrope } from 'next/font/google';
import { Providers } from '@/features/shell/providers';
import { themeScript } from '@/features/shell/theme';
import './globals.css';

const display = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
const body = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-canvas font-sans text-text">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
