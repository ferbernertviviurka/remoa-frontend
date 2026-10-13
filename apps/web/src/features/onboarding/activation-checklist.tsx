'use client';

import { useEffect, useState } from 'react';
import type { ActivationItem } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Icon, IconButton, Progress } from '@remoa/ui';

const t = withStrings({ onboarding: more.onboarding });

// ponytail: dismissal and install flag live in localStorage (per browser); a profile field needs a contract change (rule 5).
const DISMISSED_KEY = 'remoa-checklist-dismissed';
const INSTALLED_KEY = 'remoa-pwa-installed';

type Row = { id: string; label: string; count?: string; done: boolean; hint?: string };

/** FR-9: server counts (cards/edges/sessions) + the local "instalar" item (only the browser knows display-mode). Hides when all done. */
export function ActivationChecklist({ items }: { items: ActivationItem[] }) {
  // The server render cannot know: starts as "not installed / not dismissed" and the effect corrects it.
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    // Installed = running standalone, or we saw it (standalone / appinstalled) on this browser before: from a normal tab the browser cannot tell.
    const markInstalled = () => {
      setInstalled(true);
      try { localStorage.setItem(INSTALLED_KEY, '1'); } catch { /* private mode */ }
    };
    try {
      if (window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone) markInstalled();
      else if (localStorage.getItem(INSTALLED_KEY)) setInstalled(true);
      if (localStorage.getItem(DISMISSED_KEY)) setDismissed(true);
    } catch {
      /* no matchMedia/storage: stays "not installed" */
    }
    window.addEventListener('appinstalled', markInstalled);
    return () => window.removeEventListener('appinstalled', markInstalled);
  }, []);
  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* private mode: closes for this visit only */ }
  }
  if (dismissed) return null;
  if (items.length === 0) return null;
  const rows: Row[] = [
    ...items.map((i) => ({
      id: i.id,
      label: t(`onboarding.checklist.${i.id}`, { n: i.target }),
      count: t('onboarding.checklist.count', { current: Math.min(i.current, i.target), target: i.target }),
      done: i.done,
    })),
    { id: 'install', label: t('onboarding.checklist.install'), done: installed, hint: t('onboarding.checklist.installHint') },
  ];
  const done = rows.filter((r) => r.done).length;
  if (done === rows.length) return null;
  return (
    <section aria-labelledby="home-checklist" className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface p-5 md:p-[22px]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id="home-checklist" className="m-0 font-display text-[22px] font-extrabold tracking-[-0.02em]">{t('onboarding.checklist.title')}</h2>
        <span className="text-[13px] text-muted">{t('onboarding.checklist.progress', { done, total: rows.length })}</span>
        </div>
        <IconButton aria-label={t('onboarding.checklist.dismiss')} onClick={dismiss}><Icon name="close" size={18} /></IconButton>
      </div>
      <Progress aria-label={t('onboarding.checklist.title')} value={done} max={rows.length} />
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((r) => (
          <li key={r.id} data-done={r.done} className="flex items-start gap-3 text-[15px]">
            <span aria-hidden="true" className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${r.done ? 'bg-primary text-on-primary' : 'border-2 border-unknown-soft'}`}>
              {r.done ? <Icon name="check" size={14} /> : null}
            </span>
            <span className="flex flex-col">
              <span className={r.done ? 'text-muted line-through' : 'font-semibold'}>{r.label}</span>
              {r.done ? <span className="sr-only">{t('onboarding.checklist.done')}</span> : r.count ? <span className="text-[13px] text-muted">{r.count}</span> : r.hint ? <span className="text-[13px] text-muted">{r.hint}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
