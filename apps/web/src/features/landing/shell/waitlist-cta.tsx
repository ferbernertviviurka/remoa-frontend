'use client';

import './shell.css';
import { useState } from 'react';
import Link from 'next/link';
import { t, strings } from '@remoa/strings';
import { WaitlistForm, type WaitlistState, type WaitlistValues } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { postWaitlist, WAITLIST_SEGMENTS } from './waitlist';
import type { LaunchPhase } from '../flags';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const dots = [
  'left-[18px] top-9 size-3.5 bg-[#FDBA74] md:left-[60px] md:top-12',
  'right-6 top-14 size-5 bg-[#C9BFFF] opacity-70 md:right-24 md:top-[70px]',
  'left-8 bottom-12 size-2.5 bg-[#FCD34D] md:left-[120px] md:bottom-[60px]',
  'right-5 bottom-10 size-3 bg-[#7A6FB0] md:right-[70px] md:bottom-[50px]',
];

/** FR-14: dark CTA block. `waitlist` phase: form; `open` phase: link to sign-up. */
export function WaitlistCta({ phase, variant }: { phase: LaunchPhase; variant: '29' | '49' | null }) {
  const [state, setState] = useState<WaitlistState>('idle');
  const [email, setEmail] = useState('');
  const [segment, setSegment] = useState<string>(WAITLIST_SEGMENTS[1]!);
  const [error, setError] = useState('');

  const fail = (msg: string) => { setError(msg); setState('error'); };
  const submit = async (v: WaitlistValues) => {
    if (!v.email.trim()) return fail(t('landing.waitlist.validation.emailRequired'));
    if (!EMAIL.test(v.email.trim())) return fail(t('landing.waitlist.validation.emailInvalid'));
    setState('submitting');
    const seg = WAITLIST_SEGMENTS.find((s) => s === segment) ?? WAITLIST_SEGMENTS[1]!;
    const r = await postWaitlist({ email: v.email.trim(), segment: seg, variant, honeypot: v.honeypot });
    if (r.kind === 'ok') {
      setState('success');
      if (!v.honeypot) track('waitlist_joined', { segment: seg, variant });
    } else if (r.kind === 'invalid') fail(t('landing.waitlist.validation.emailInvalid'));
    else if (r.kind === 'rate_limited') fail(t('landing.waitlist.errors.rateLimited'));
    else fail(t('landing.waitlist.errors.submit'));
  };

  return (
    <section id="cta" aria-labelledby="cta-title" className="scroll-mt-[92px] py-20 md:pt-[150px] md:pb-[110px]">
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-10">
        <div className="relative flex flex-col items-center gap-5 overflow-hidden rounded-[28px] bg-panel-dark px-5 py-14 text-center text-on-dark md:rounded-[44px] md:px-16 md:py-20">
          {dots.map((c) => <span key={c} aria-hidden="true" className={`lp-dot absolute rounded-full ${c}`} />)}
          <h2 id="cta-title" className="relative m-0 max-w-[820px] font-display text-[40px] leading-[1.02] font-extrabold tracking-[-0.04em] md:text-[72px]">{t('landing.ctaSection.title')}</h2>
          <p className="relative m-0 text-[17px] text-on-dark-muted-2 md:text-xl">{phase === 'open' ? t('landing.ctaSection.text') : t('landing.ctaSection.textWaitlist')}</p>
          <div className="relative mt-3 flex w-full justify-center">
            {phase === 'open' ? (
              <Link href="/cadastro" className="inline-flex min-h-14 items-center justify-center rounded-field bg-surface px-[26px] text-[17px] font-extrabold text-panel-dark no-underline hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steady-on-dark">{t('landing.ctaSection.primary')}</Link>
            ) : (
              <WaitlistForm
                state={state} email={email} onEmailChange={setEmail} segment={segment} onSegmentChange={setSegment} onSubmit={submit}
                emailLabel={t('landing.waitlist.email.label')} emailPlaceholder={t('landing.waitlist.email.placeholder')}
                segmentLabel={t('landing.waitlist.segment.label')}
                segments={strings.landing.waitlist.segment.options.map((label, i) => ({ value: WAITLIST_SEGMENTS[i]!, label }))}
                submitLabel={t('landing.waitlist.submit')} error={error}
                successTitle={t('landing.waitlist.success.title')} successText={t('landing.waitlist.success.text')}
                resetLabel={t('landing.waitlist.success.alternate')} onReset={() => { setEmail(''); setError(''); setState('idle'); }}
                honeypotLabel={t('landing.waitlist.honeypot')}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
