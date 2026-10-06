'use client';

import { t } from '@remoa/strings/referral';
import { Icon, type IconName } from '@remoa/ui';

const steps: ReadonlyArray<{ icon: IconName; title: 'step1' | 'step2' | 'step3' }> = [
  { icon: 'share', title: 'step1' },
  { icon: 'maps', title: 'step2' },
  { icon: 'gift', title: 'step3' },
];

/** FR-9: três passos com numeração e ícone; a linha de progresso cresce com a rolagem (`growx`, só onde há `animation-timeline`). */
export function HowItWorks() {
  return (
    <section id="como" aria-labelledby="t-como" className="flex scroll-mt-6 flex-col gap-[26px]">
      <div className="rf-reveal flex flex-col gap-2.5">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{t('referral.howItWorks.label')}</span>
        <h2 id="t-como" className="m-0 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.035em] md:text-[44px]">{t('referral.howItWorks.title')}</h2>
      </div>
      <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-[3px] bg-border"><span className="rf-growx block h-1.5 rounded-[3px] bg-primary" /></span>
      <ol className="m-0 grid list-none grid-cols-3 gap-6 p-0 max-md:grid-cols-1">
        {steps.map((s, i) => (
          <li key={s.title} className="rf-reveal relative flex flex-col gap-3.5 rounded-[32px] border border-border bg-surface p-[26px]">
            <span className="flex items-center justify-between">
              <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-[18px] bg-primary-tint text-primary-deep"><Icon name={s.icon} size={28} /></span>
              <span aria-hidden="true" className="font-display text-[46px] font-extrabold leading-none tracking-[-0.04em] text-muted">{String(i + 1).padStart(2, '0')}</span>
            </span>
            <h3 className="m-0 font-display text-2xl font-extrabold leading-[1.15] tracking-[-0.025em]">{t(`referral.howItWorks.${s.title}.title`)}</h3>
            <p className="m-0 text-[15.5px] leading-[1.55] text-muted">{t(`referral.howItWorks.${s.title}.desc`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
