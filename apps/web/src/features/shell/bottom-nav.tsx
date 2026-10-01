'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@remoa/strings';
import { navItems } from './nav-items';

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label={t('shell.bottomNav.label')} className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface md:hidden">
      {navItems
        .filter((i) => i.bottom)
        .map((i) => {
          const active = path === i.href || path.startsWith(`${i.href}/`);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${active ? 'text-primary-deep' : 'text-muted'}`}
            >
              {i.icon}
              <span className="truncate">{t(i.short)}</span>
            </Link>
          );
        })}
    </nav>
  );
}
