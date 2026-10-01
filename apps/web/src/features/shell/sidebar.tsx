'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@remoa/strings';
import { Logo } from '@remoa/ui';
import { navItems } from './nav-items';

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-border bg-surface p-4 md:flex">
      <Link href="/mapas" className="flex items-center gap-2 font-display text-lg font-extrabold text-text">
        <Logo size={28} />
        {t('common.appName')}
      </Link>
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
    </aside>
  );
}
