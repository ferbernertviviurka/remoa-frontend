'use client';

import { useRef, type ReactNode } from 'react';
import type { EventProps } from '@remoa/contracts';
import { track } from '@/lib/analytics';

type RevisarChart = EventProps['revisar_chart_interacted']['chart'];

/** Card of the Revisar sections (mock: radius 34, padding 26/28, title 24/800 + 14 px subtitle, scroll reveal). */
export function SectionCard({ id, title, sub, right, tight, chart, children }: { id: string; title: string; sub?: string; right?: ReactNode; tight?: boolean; chart?: RevisarChart; children: ReactNode }) {
  // F21 FR-19: first hover/focus on a chart, once per visit
  const seen = useRef(false);
  const touch = chart ? () => { if (!seen.current) { seen.current = true; track('revisar_chart_interacted', { chart }); } } : undefined;
  return (
    <section aria-labelledby={id} onPointerEnter={touch} onFocusCapture={touch} className={`mk-reveal box-border flex min-w-0 flex-col gap-3.5 rounded-[34px] border border-border bg-surface px-7 ${tight ? 'pb-3.5 pt-[26px]' : 'py-[26px]'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id={id} className="m-0 font-display text-2xl font-extrabold tracking-[-.025em]">{title}</h2>
          {sub ? <span className="text-sm text-muted">{sub}</span> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

/** "yyyy-mm-dd" as a local date (no timezone shift). */
export const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
};
