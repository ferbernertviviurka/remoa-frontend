'use client';

import { useState } from 'react';
import Link from 'next/link';
import { t } from '@remoa/strings/referral';
import { Icon } from '@remoa/ui';

const items = [1, 2, 3, 4, 5] as const;

/** FR-13: cinco perguntas em acordeão (altura 400 ms, ícone 300 ms) e o link para o regulamento. Um aberto por vez. */
export function Rules() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section aria-labelledby="t-reg" className="grid grid-cols-[minmax(0,4fr)_minmax(0,7fr)] items-start gap-12 max-md:grid-cols-1 max-md:gap-6">
      <div className="rf-reveal flex flex-col gap-2.5">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{t('referral.rules.label')}</span>
        <h2 id="t-reg" className="m-0 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.035em] md:text-[40px]">{t('referral.rules.title')}</h2>
        <Link href="/regulamento-indicacao" className="mt-2 inline-flex min-h-11 items-center self-start font-bold text-primary-deep underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{t('referral.rules.regulationLink')}</Link>
      </div>
      <div className="rf-reveal rounded-[34px] border border-border bg-surface px-7 py-2.5 max-md:px-4">
        {items.map((n, i) => {
          const on = open === n;
          return (
            <div key={n} className={i > 0 ? 'border-t border-divider' : ''}>
              <h3 className="m-0">
                <button type="button" id={`rule-q${n}`} aria-expanded={on} aria-controls={`rule-a${n}`} onClick={() => setOpen(on ? null : n)} className="flex min-h-[68px] w-full items-center justify-between gap-4 px-1 text-left text-[17px] font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  <span>{t(`referral.rules.q${n}`)}</span>
                  <span aria-hidden="true" className="flex text-primary-deep transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `rotate(${on ? 45 : 0}deg)` }}><Icon name="plus" size={22} /></span>
                </button>
              </h3>
              <div id={`rule-a${n}`} role="region" aria-labelledby={`rule-q${n}`} className="grid transition-[grid-template-rows] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ gridTemplateRows: on ? '1fr' : '0fr' }}>
                <div className="min-h-0 overflow-hidden"><p className="m-0 max-w-[640px] px-1 pb-5 text-[15.5px] leading-[1.6] text-ink-2" inert={!on}>{t(`referral.rules.a${n}`)}</p></div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
