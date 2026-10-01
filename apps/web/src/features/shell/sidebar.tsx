'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@remoa/strings';
import { Logo, Separator } from '@remoa/ui';
import type { BoardSummary } from '@remoa/contracts';
import { navItems } from './nav-items';

export function Sidebar({ boards = [] }: { boards?: BoardSummary[] }) {
  const path = usePathname();
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
                <span className="shrink-0 text-xs text-muted">{b.cardCount}</span>
              </Link>
            </li>
          ))}
          </ul>
        </>
      ) : null}
    </aside>
  );
}
