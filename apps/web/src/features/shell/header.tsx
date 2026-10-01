'use client';

import { usePathname } from 'next/navigation';
import type { BoardSummary } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Breadcrumb, Button } from '@remoa/ui';
import { navItems } from './nav-items';
import { ThemeToggle } from './theme-toggle';

export function Header({ boards }: { boards: BoardSummary[] }) {
  const path = usePathname();
  const section = navItems.find((item) => path === item.href || path.startsWith(`${item.href}/`));
  const items = [{ label: section ? t(section.label) : t('shell.header.breadcrumbRoot') }];
  const boardId = path.startsWith('/mapas/') ? path.split('/')[2] : undefined;
  const board = boardId ? boards.find((item) => item.id === boardId) : undefined;
  if (board) items.push({ label: board.title });

  return (
    <header className="flex min-h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4 md:px-6">
      <div className="min-w-0">
        <Breadcrumb label={t('shell.header.breadcrumbLabel')} items={items} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        <Button disabled>{t('shell.header.import')}</Button>
      </div>
    </header>
  );
}
