'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { strings, t } from '@remoa/strings/landing';
import { VerdictBox } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { trackCta } from '../analytics';
import type { LandingFlags } from '../flags';

const d = strings.landing.demo;

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

/** Demo sem cadastro (FR-10): só cliente, nada é gravado. `flags.launchPhase` decide o destino do CTA. */
export function DemoSection({ flags }: { flags: Pick<LandingFlags, 'launchPhase'> }) {
  const [pick, setPick] = useState<number | null>(null);
  const started = useRef(false);
  const answered = pick !== null;
  const right = pick === d.correctIndex;

  const answer = (i: number) => {
    if (answered) return;
    if (!started.current) { started.current = true; track('demo_started', {}); }
    setPick(i);
    track('demo_answered', { correct: i === d.correctIndex });
    track('demo_completed', {});
  };
  const verdictLabel = t(right ? 'landing.demo.verdicts.correct' : 'landing.demo.verdicts.incorrect');
  const explanation = t(right ? 'landing.demo.explanationCorrect' : 'landing.demo.explanationIncorrect');
  const visible = d.flow.slice(0, 4);

  return (
    <section id="experimente" aria-labelledby="experimente-title" className="scroll-mt-[92px] pt-20 md:pt-[150px]">
      <div className="mx-auto grid w-full max-w-[1280px] items-center gap-10 px-4 md:grid-cols-[5fr_6fr] md:gap-14 md:px-10">
        <div className="flex flex-col gap-[18px]">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{t('landing.demo.noSignup')}</span>
          <h2 id="experimente-title" className="m-0 font-display text-[34px] leading-[1.05] font-extrabold tracking-[-0.035em] md:text-[44px] lg:text-[56px]">{t('landing.demo.title')}</h2>
          <p className="m-0 text-[17px] leading-normal text-muted md:text-[19px]">{t('landing.demo.intro')}</p>
          {answered ? (
            <Link href={flags.launchPhase === 'open' ? '/cadastro' : '#cta'} onClick={trackCta('demo', flags.launchPhase === 'open' ? 'create' : 'waitlist')} className={`pop flex min-h-14 items-center gap-2.5 self-start rounded-field bg-primary px-[26px] text-[17px] font-extrabold text-on-primary no-underline ${focus}`}>
              {t('landing.demo.cta')}
            </Link>
          ) : null}
        </div>
        <div className="flex flex-col gap-4 rounded-[34px] border border-border bg-surface p-4 shadow-[0_30px_80px_rgba(36,26,92,0.12)] md:p-[26px]">
          <div className="flex items-center justify-between gap-2.5 text-[12.5px] font-bold">
            <span className="flex flex-wrap gap-2">
              <span className="rounded-full bg-primary-tint px-3 py-1 text-primary-deep">{t('landing.demo.nextStep')}</span>
              <span className="rounded-full bg-track px-3 py-1 text-muted">{t('landing.demo.demoLabel')}</span>
            </span>
            <span className="text-muted">{t('landing.demo.progress', { current: 1, total: 1 })}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{t('landing.demo.bundleTag')}</span>
            <ol className="m-0 flex list-none flex-col gap-1.5 p-0 text-[15px]">
              {visible.map((s, i) => (
                <li key={s} className="flex gap-2.5 rounded-xl border border-border px-3 py-2"><span className="font-bold text-primary-deep">{i + 1}</span>{s}</li>
              ))}
              {answered ? (
                <li key="revealed" className="pop flex gap-2.5 rounded-xl border-[1.5px] border-review bg-review-bg px-3 py-2 font-bold text-review-text"><span>5</span>{d.alternatives[d.correctIndex]}</li>
              ) : (
                <li key="hidden" className="flex gap-2.5 rounded-xl border-[1.5px] border-dashed border-review bg-review-bg px-3 py-2 font-semibold text-review-text"><span className="font-bold">5</span>{d.flow[4]}</li>
              )}
            </ol>
          </div>
          <h3 className="m-0 mt-1 font-display text-[22px] leading-[1.3] font-bold tracking-[-0.02em]">{t('landing.demo.question')}</h3>
          <div role="group" aria-label={t('landing.demo.alternativesLabel')} className="flex flex-col gap-2">
            {d.alternatives.map((text, i) => {
              const good = answered && i === d.correctIndex;
              const bad = pick === i && !right;
              return (
                <button key={text} type="button" aria-pressed={pick === i} disabled={answered && !good && !bad} onClick={() => answer(i)}
                  className={`flex min-h-[50px] items-center gap-3 rounded-[14px] border-[1.5px] px-3.5 py-2 text-left text-[14.5px] font-semibold ${focus} ${answered ? 'cursor-default' : 'cursor-pointer hover:border-primary'} ${good ? 'border-primary bg-primary-tint' : bad ? 'border-review bg-review-bg' : 'border-border bg-surface'}`}>
                  <span aria-hidden="true" className={`flex size-[26px] shrink-0 items-center justify-center rounded-full text-xs font-bold ${good ? 'bg-primary text-on-primary' : bad ? 'bg-review text-white' : 'bg-track text-muted'}`}>{String.fromCharCode(65 + i)}</span>
                  {text}
                </button>
              );
            })}
          </div>
          {/* aria-live fica sempre montado; VerdictBox (role=status) entra dentro dele */}
          <div aria-live="polite">
            {answered ? (
              <VerdictBox verdict={right ? 'correct' : 'incorrect'} label={verdictLabel} headline={explanation} note={`${t('landing.demo.source')} ${t('landing.demo.demoLabel')}.`} />
            ) : null}
          </div>
          {answered ? (
            <button type="button" onClick={() => setPick(null)} className={`min-h-11 cursor-pointer self-start border-0 bg-transparent px-1 text-sm font-bold text-primary-deep underline ${focus}`}>{t('landing.demo.retry')}</button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
