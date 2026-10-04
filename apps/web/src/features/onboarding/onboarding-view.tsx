'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import type { Goal, OnboardingAnswersPatch, OnboardingState, Segment } from '@remoa/contracts';
import { t, type StringKey } from '@remoa/strings';
import { Alert, Button, ChoiceCard, ChoiceRow, Logo, Stepper } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { GOAL_GROUPS, SEGMENTS } from './options';

type Path = 'pdf' | 'anki' | 'seed' | 'blank';
const PATHS: ReadonlyArray<{ id: Path; icon: 'file' | 'archive' | 'book' | 'plus' }> = [
  { id: 'pdf', icon: 'file' },
  { id: 'anki', icon: 'archive' },
  { id: 'seed', icon: 'book' },
  { id: 'blank', icon: 'plus' },
];
const STEPS = ['segment', 'goal', 'area', 'start'] as const;

export function OnboardingView({ initial }: { initial: Pick<OnboardingState, 'answers'> }) {
  const [step, setStep] = useState(0);
  const [segment, setSegment] = useState<Segment | undefined>(initial.answers.segment);
  const [goal, setGoal] = useState<Goal | undefined>(initial.answers.goal as Goal | undefined);
  const [area, setArea] = useState<'CM' | undefined>(initial.answers.area === 'CM' ? 'CM' : undefined);
  const [path, setPath] = useState<Path | undefined>(initial.answers.startPath);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const h1 = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) first.current = false;
    else h1.current?.focus();
  }, [step]);

  const key = STEPS[step]!;
  const value = [segment, goal, area, path][step];

  async function save(patch: OnboardingAnswersPatch): Promise<boolean> {
    if (Object.keys(patch).length === 0) return true;
    const r = await api<OnboardingState>('/v1/onboarding/answers', { method: 'POST', body: JSON.stringify(patch) }).catch(() => null);
    return !!r?.ok;
  }

  async function next(skip: boolean) {
    setBusy(true);
    setFailed(false);
    const patch: OnboardingAnswersPatch = skip ? {} : { ...[{ segment }, { goal }, { area }, {}][step] };
    if (!(await save(patch))) {
      setFailed(true);
      setBusy(false);
      return;
    }
    track('onboarding_step', { step: step + 1 });
    setStep(step + 1);
    setBusy(false);
  }

  /** `chosen` = the path to open in Novo mapa; none = leave for Hoje. */
  async function finish(chosen?: Path) {
    setBusy(true);
    setFailed(false);
    if (chosen && chosen !== 'blank' && !(await save({ startPath: chosen }))) return fail();
    const done = await api<OnboardingState>('/v1/onboarding/complete', { method: 'POST' }).catch(() => null);
    if (!done?.ok) return fail();
    track('onboarding_completed', { path: chosen ?? 'skipped' }); // "blank" is its own path (D-530)
    // Hard navigation: the router cache may hold the (app) layout's redirect to this very page for /app/hoje.
    window.location.assign(chosen ? `/app/mapas/novo?caminho=${chosen}&de=onboarding` : '/app/hoje');
  }
  function fail() {
    setFailed(true);
    setBusy(false);
  }

  const steps = STEPS.map((s) => t(`onboarding.step.${s}` as StringKey));
  const title = t(`onboarding.${key}.title` as StringKey);
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 pb-10 pt-5 sm:px-6 sm:pt-[30px] md:gap-7">
        <div className="flex items-center justify-between gap-4">
          <Link href="/app/hoje" aria-label={t('pages.logoLink')} className="inline-flex min-h-11 min-w-11 items-center no-underline">
            <Logo size={32} withWordmark />
          </Link>
          <Stepper aria-label={t('onboarding.stepsLabel')} doneLabel={t('onboarding.stepDone')} current={step} steps={steps} />
        </div>

        <div className="flex flex-col gap-[22px]">
          <div className="flex flex-col gap-1.5">
            <h1 ref={h1} tabIndex={-1} className="m-0 font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.03em] outline-none md:text-[38px]">{title}</h1>
            <p className="m-0 text-base text-muted">{t(`onboarding.${key}.desc` as StringKey)}</p>
          </div>

          {step === 0 ? (
            <div role="group" aria-label={title} className="flex flex-col gap-2.5">
              {SEGMENTS.map((s) => (
                <ChoiceRow key={s.id} indicator="radio" selected={segment === s.id} onSelect={() => setSegment(s.id)}>{t(s.label)}</ChoiceRow>
              ))}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="flex flex-col gap-5">
              {GOAL_GROUPS.map((g) => (
                <div key={g.title} role="group" aria-label={t(g.title)} className="flex flex-col gap-2.5">
                  <h2 className="m-0 text-xs font-bold uppercase tracking-[.12em] text-muted">{t(g.title)}</h2>
                  {g.goals.map((o) => (
                    <ChoiceRow key={o.id} indicator="radio" selected={goal === o.id} onSelect={() => setGoal(o.id)}>{t(o.label)}</ChoiceRow>
                  ))}
                </div>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div role="group" aria-label={title} className="flex flex-col gap-2.5">
              <ChoiceRow indicator="radio" selected={area === 'CM'} onSelect={() => setArea('CM')}>{t('boards.area.CM')}</ChoiceRow>
            </div>
          ) : null}

          {step === 3 ? (
            <div role="group" aria-label={title} className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {PATHS.map((p) => (
                <ChoiceCard
                  key={p.id}
                  icon={p.icon}
                  tag={t(`newMap.path.${p.id}Tag` as StringKey)}
                  title={t(`newMap.path.${p.id}` as StringKey)}
                  description={t(`newMap.path.${p.id}Desc` as StringKey)}
                  selected={path === p.id}
                  onSelect={() => setPath(p.id)}
                />
              ))}
            </div>
          ) : null}

          {failed ? <Alert tone="review" role="alert" title={t('onboarding.saveError')} /> : null}

          <div className="flex flex-wrap items-center gap-3">
            {step > 0 ? <Button variant="secondary" disabled={busy} onClick={() => setStep(step - 1)}>{t('onboarding.back')}</Button> : null}
            {step < 3 ? (
              <>
                <Button loading={busy} disabled={!value} onClick={() => void next(false)}>{t('onboarding.next')}</Button>
                <Button variant="secondary" disabled={busy} onClick={() => void next(true)}>{t('onboarding.skipStep')}</Button>
              </>
            ) : (
              <Button loading={busy} disabled={!path} onClick={() => void finish(path)}>{t('onboarding.finish')}</Button>
            )}
            <Button variant="secondary" disabled={busy} onClick={() => void finish()}>{t('onboarding.skipAll')}</Button>
          </div>
        </div>
      </main>
    </div>
  );
}
