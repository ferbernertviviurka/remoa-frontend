import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { t } from '@remoa/strings';
import { Card, Constellation, Logo } from '@remoa/ui';

const nodes = [
  { x: 190, y: 150, size: 26, state: 'review' as const, pulse: true, label: 'Sepse', labelSide: 'right' as const },
  { x: 80, y: 70, size: 16, state: 'watch' as const },
  { x: 300, y: 60, size: 18, state: 'steady' as const },
  { x: 90, y: 240, size: 16, state: 'unknown' as const },
  { x: 310, y: 240, size: 16, state: 'steady' as const },
];
const edges = [[0, 1], [0, 2], [0, 3], [0, 4]] as const;

// G11 (D-359): sign-in/sign-up are not search landing pages; noindex keeps them out of results, follow keeps link equity.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="hidden flex-col justify-between gap-10 bg-panel-dark p-12 text-on-dark lg:sticky lg:top-0 lg:flex lg:h-dvh lg:self-start">
        <Link href="/" aria-label={t('landing.nav.wordmark.aria')} className="inline-flex min-h-11 items-center self-start no-underline"><Logo size={36} withWordmark onDark /></Link>
        <div className="flex flex-col items-start gap-8">
          <Constellation nodes={nodes} edges={edges} />
          <div className="flex max-w-[420px] flex-col gap-3">
            <p className="m-0 font-display text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em]">{t('auth.brand.tagline')}</p>
            <p className="m-0 text-base leading-normal text-on-dark-muted-2">{t('auth.brand.sub')}</p>
          </div>
        </div>
      </aside>
      <main className="flex flex-col items-center justify-center gap-6 px-4 py-8 sm:p-8">
        {/* G14 (D-587): signed-in users never see these forms (middleware), so the logo always goes to the site. */}
        <Link href="/" aria-label={t('landing.nav.wordmark.aria')} className="inline-flex min-h-11 items-center no-underline lg:hidden"><Logo size={32} withWordmark /></Link>
        <div className="w-full max-w-[480px]">
          <Card radius="list" padded={false}>
            <div className="p-6 sm:p-8">{children}</div>
          </Card>
        </div>
      </main>
    </div>
  );
}
