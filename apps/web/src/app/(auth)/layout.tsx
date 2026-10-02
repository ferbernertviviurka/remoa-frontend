import type { ReactNode } from 'react';
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

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="hidden flex-col justify-between gap-10 bg-panel-dark p-12 text-on-dark lg:flex">
        <Logo size={36} withWordmark onDark />
        <div className="flex flex-col items-start gap-8">
          <Constellation nodes={nodes} edges={edges} />
          <div className="flex max-w-[420px] flex-col gap-3">
            <p className="m-0 font-display text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em]">{t('auth.brand.tagline')}</p>
            <p className="m-0 text-base leading-normal text-on-dark-muted-2">{t('auth.brand.sub')}</p>
          </div>
        </div>
      </aside>
      <main className="flex flex-col items-center justify-center gap-6 px-4 py-8 sm:p-8">
        <div className="lg:hidden"><Logo size={32} withWordmark /></div>
        <div className="w-full max-w-[480px]">
          <Card radius="list" padded={false}>
            <div className="p-6 sm:p-8">{children}</div>
          </Card>
        </div>
      </main>
    </div>
  );
}
