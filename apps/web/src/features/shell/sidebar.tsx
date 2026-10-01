'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@remoa/strings';
import { Logo, Separator } from '@remoa/ui';
import type { BoardSummary } from '@remoa/contracts';
import { navItems } from './nav-items';

const DueBadge = ({ n }: { n: number }) =>
  n > 0 ? (
    <span className="ml-auto shrink-0 rounded-pill border border-review bg-review-bg px-2 text-xs font-bold text-review-text">
      <span aria-hidden="true">{n}</span>
      <span className="sr-only">{t('review.badge', { n })}</span>
    </span>
  ) : null;

export function Sidebar({ boards = [] }: { boards?: BoardSummary[] }) {
  const path = usePathname();
  const totalDue = boards.reduce((a, b) => a + b.dueCount, 0);
  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-border bg-surface p-4 md:flex">
      <Link href="/mapas" className="flex items-center gap-2 font-display text-lg font-extrabold text-text">
        <Logo size={28} />
        {t('common.appName')}
      </Link>
      <Separator />
      <nav aria-label={t('shell.nav.label')} className="flex flex-col gap-1">
        {navItems.map((i) => {
          const active = path === i.href || path.startsWith(`${i.href}/`);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[42px] items-center gap-3 rounded-btn px-3 text-sm font-semibold ${active ? 'bg-primary-tint text-primary-deep' : 'text-muted hover:bg-primary-tint'}`}
            >
              {i.icon}
              {t(i.label)}
              {i.href === '/revisar' ? <DueBadge n={totalDue} /> : null}
            </Link>
          );
        })}
      </nav>
      {boards.length > 0 ? (
        <>
          <Separator />
          <ul aria-label={t('boards.sidebarLabel')} className="flex flex-col gap-1">
          {boards.map((b) => (
            <li key={b.id}>
              <Link
                href={`/mapas/${b.id}`}
                aria-current={path === `/mapas/${b.id}` ? 'page' : undefined}
                className="flex min-h-[44px] items-center justify-between gap-2 rounded-btn px-3 text-sm text-text hover:bg-primary-tint"
              >
                <span className="truncate">{b.title}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
                  <DueBadge n={b.dueCount} />
                  {b.cardCount}
                </span>
              </Link>
            </li>
          ))}
          </ul>
        </>
      ) : null}
    </aside>
  );
}
