'use client';

import { useEffect, useState } from 'react';
import type { ActivationItem } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Icon, Progress } from '@remoa/ui';

type Row = { id: string; label: string; count?: string; done: boolean; hint?: string };

/** FR-9: server counts (cards/edges/sessions) + the local "instalar" item (only the browser knows display-mode). Hides when all done. */
export function ActivationChecklist({ items }: { items: ActivationItem[] }) {
  // null until mounted: the server render cannot know, so it shows "not installed" and the effect corrects it.
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    try {
      setInstalled(window.matchMedia('(display-mode: standalone)').matches);
    } catch {
      /* no matchMedia: stays "not installed" */
    }
  }, []);
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
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="home-checklist" className="m-0 font-display text-[22px] font-extrabold tracking-[-0.02em]">{t('onboarding.checklist.title')}</h2>
        <span className="text-[13px] text-muted">{t('onboarding.checklist.progress', { done, total: rows.length })}</span>
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
