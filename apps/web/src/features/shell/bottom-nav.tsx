'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@remoa/strings';
import { Icon } from '@remoa/ui';
import { useNavPending } from './nav-pending';
import { isActive, items } from './rail';

/** Mesmos destinos do trilho (rail.tsx `items`) + Conta. `dueTotal` = badge do Revisar. Altura 64 px + safe-area; o `main` reserva o mesmo espaço (app-shell). */
export function BottomNav({ dueTotal = 0 }: { dueTotal?: number }) {
  const path = usePathname();
  const { pending, setPending } = useNavPending();
  const all = [...items, { href: '/conta', icon: 'user' as const, label: 'rail.account' as const }];
  return (
    <nav aria-label={t('shell.bottomNav.label')} className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      {all.map((i) => {
        const active = pending ? pending === i.href : isActive(path, i.href, false);
        const badge = i.href === '/revisar' && dueTotal > 0;
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? 'page' : undefined}
            onClick={() => !isActive(path, i.href, false) && setPending(i.href)}
            className={`relative flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold no-underline ${active ? 'text-primary-deep' : 'text-muted'}`}
          >
            <Icon name={i.icon} size={22} />
            <span className="max-w-full truncate px-0.5">{i.href === '/conta' ? t('shell.bottomNav.account') : t(i.label)}</span>
            {badge ? (
              <span className="absolute left-1/2 top-1.5 ml-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-review px-1 text-[11px] font-bold text-white">
                <span aria-hidden="true">{dueTotal}</span>
                <span className="sr-only">{t('review.badge', { n: dueTotal })}</span>
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
