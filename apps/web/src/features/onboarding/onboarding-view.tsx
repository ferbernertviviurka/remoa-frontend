'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { AREA_OPTIONS, MAX_GOALS, isValidName, normalizeBrPhone, normalizeName, userTypes, type Goal, type OnboardingAnswersPatch, type OnboardingState, type RequiredProfileField, type Segment, type UserType } from '@remoa/contracts';
import { MEDICAL_SCHOOLS } from '@remoa/contracts/medical-schools';
import { t, type StringKey } from '@remoa/strings';
import { Alert, Autocomplete, Button, ChoiceCard, ChoiceRow, Input, Logo, Stepper, type AutocompleteValue } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { useAcceptLegal } from '@/features/legal/use-accept-legal';
import { maskPhone } from '../account/profile/personal-fields';
import { GOAL_GROUPS, SEGMENTS } from './options';

type Path = 'pdf' | 'anki' | 'seed' | 'blank';
const PATHS: ReadonlyArray<{ id: Path; icon: 'file' | 'archive' | 'book' | 'plus' }> = [
  { id: 'pdf', icon: 'file' },
  { id: 'anki', icon: 'archive' },
  { id: 'seed', icon: 'book' },
  { id: 'blank', icon: 'plus' },
];
const STEPS = ['segment', 'institution', 'goal', 'area', 'start'] as const;
const SCHOOL_OPTIONS = MEDICAL_SCHOOLS.map((s) => ({ value: s.id, label: s.name, hint: `${s.city} · ${s.uf}`, keywords: s.acronym ? [s.acronym] : [] }));
type StepKey = 'userType' | (typeof STEPS)[number];

type ProfileDraft = { name: string | null; phone: string | null; school: string | null; schoolId: string | null };

/**
 * `missing` (G20, D-844): required profile fields still empty (Google sign-up, e-mail confirmed later, pre-G20 account); the first step
 * "Conte quem você é" asks them and cannot be skipped. `profileOnly`: onboarding already done, so only that step shows, then `next`.
 */
export function OnboardingView({ initial, missing = [], profile, next: nextUrl = '/app/hoje', profileOnly = false }: { initial: Pick<OnboardingState, 'answers'>; missing?: readonly RequiredProfileField[]; profile?: ProfileDraft; next?: string; profileOnly?: boolean }) {
  const needsUserType = missing.includes('userType');
  const needsProfile = missing.length > 0;
  useAcceptLegal(needsUserType); // D-954: the Google sign-up path (needsUserType) never saw the consent line
  const [name, setName] = useState(profile?.name ?? '');
  const [phone, setPhone] = useState(profile?.phone ? maskPhone(profile.phone) : '');
  const [institution, setInstitution] = useState<AutocompleteValue | null>(profile?.school ? { value: profile.schoolId, label: profile.school } : null);
  const [step, setStep] = useState(0);
  const [segment, setSegment] = useState<Segment | undefined>(initial.answers.segment);
  const [userType, setUserType] = useState<UserType | undefined>();
  const [picked, setGoals] = useState<Goal[]>(initial.answers.goals ?? (initial.answers.goal ? [initial.answers.goal as Goal] : []));
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

  const keys: readonly StepKey[] = profileOnly ? ['userType'] : needsProfile ? ['userType', ...STEPS] : STEPS;
  const key = keys[step]!;
  const last = keys.length - 1;
  const nameOk = !missing.includes('name') || isValidName(normalizeName(name));
  const phoneOk = !missing.includes('phone') || !!normalizeBrPhone(phone);
  const typeOk = !needsUserType || !!userType;
  const value = { userType: (nameOk && phoneOk && typeOk) || undefined, segment, institution: institution?.label.trim() || undefined, goal: picked.length > 0 || undefined, area, start: path }[key];
  const toggleGoal = (g: Goal) => setGoals((p) => (p.includes(g) ? p.filter((x) => x !== g) : p.length < MAX_GOALS ? [...p, g] : p));

  async function save(patch: OnboardingAnswersPatch): Promise<boolean> {
    if (Object.keys(patch).length === 0) return true;
    const r = await api<OnboardingState>('/v1/onboarding/answers', { method: 'POST', body: JSON.stringify(patch) }).catch(() => null);
    return !!r?.ok;
  }

  async function next(skip: boolean) {
    setBusy(true);
    setFailed(false);
    const patch: OnboardingAnswersPatch = skip ? {} : { segment: { segment }, goal: { goals: picked }, area: { area }, start: {}, userType: {}, institution: {} }[key];
    const profilePatch = key === 'userType'
      ? { ...(missing.includes('name') ? { name: normalizeName(name) } : {}), ...(missing.includes('phone') ? { phone } : {}), ...(needsUserType ? { userType } : {}) }
      : key === 'institution' && !skip && institution ? { institution: { schoolId: institution.value, name: institution.label.trim() } } : null;
    const ok = profilePatch
      ? !!(await api('/v1/account/profile', { method: 'PATCH', body: JSON.stringify(profilePatch) }).catch(() => null))?.ok
      : await save(patch);
    if (!ok) {
      setFailed(true);
      setBusy(false);
      return;
    }
    if (!profileOnly) track('onboarding_step', { step: step + 1 - (needsProfile ? 1 : 0) }); // the extra userType step keeps the old numbering (PII-free)
    if (profileOnly) {
      window.location.assign(nextUrl); // hard navigation: the guard's redirect may be in the router cache
      return;
    }
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

  const steps = keys.map((s) => t(`onboarding.step.${s}` as StringKey));
  const title = key === 'institution' && segment === 'not_med' ? t('onboarding.institution.titleOther') : t(`onboarding.${key}.title` as StringKey);
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 pb-10 pt-5 sm:px-6 sm:pt-[30px] md:gap-7">
        <div className="flex flex-col items-center gap-4">
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

          {key === 'userType' ? (
            <div className="flex flex-col gap-5">
              {missing.includes('name') ? (
                <div className="flex flex-col gap-2">
                  <Input label={t('account.profile.name')} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!nameOk && name !== ''} aria-describedby="ob-name-err" required />
                  {name !== '' && !nameOk ? <p id="ob-name-err" role="alert" className="m-0 text-sm font-semibold text-review-text">{t('auth.about.nameInvalid')}</p> : null}
                </div>
              ) : null}
              {missing.includes('phone') ? (
                <div className="flex flex-col gap-2">
                  <Input label={t('personal.phone.label')} type="tel" inputMode="tel" autoComplete="tel-national" placeholder={t('personal.phone.placeholder')} value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} aria-invalid={!phoneOk && phone !== ''} aria-describedby="ob-phone-err" required />
                  {phone !== '' && !phoneOk ? <p id="ob-phone-err" role="alert" className="m-0 text-sm font-semibold text-review-text">{t('personal.phone.invalid')}</p> : null}
                </div>
              ) : null}
              {needsUserType ? (
                <div role="group" aria-label={t('personal.userType.label')} className="flex flex-col gap-2.5">
                  {userTypes.map((u) => (
                    <ChoiceRow key={u} indicator="radio" selected={userType === u} onSelect={() => setUserType(u)}>{t(`personal.userType.${u}`)}</ChoiceRow>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {key === 'institution' ? (
            <Autocomplete
              label={t('onboarding.institution.label')}
              placeholder={t('onboarding.institution.placeholder')}
              options={SCHOOL_OPTIONS}
              value={institution}
              onValueChange={setInstitution}
              allowCustom
              customLabel={(text) => t('onboarding.institution.custom', { texto: text })}
              emptyLabel={t('onboarding.institution.empty')}
              moreLabel={(n) => t('onboarding.institution.more', { n })}
              clearAriaLabel={t('onboarding.institution.clear')}
            />
          ) : null}

          {key === 'segment' ? (
            <div role="group" aria-label={title} className="flex flex-col gap-2.5">
              {SEGMENTS.map((s) => (
                <ChoiceRow key={s.id} indicator="radio" selected={segment === s.id} onSelect={() => setSegment(s.id)}>{t(s.label)}</ChoiceRow>
              ))}
            </div>
          ) : null}

          {key === 'goal' ? (
            <div className="flex flex-col gap-5">
              <p role="status" className="m-0 text-sm font-semibold text-muted">{t('onboarding.goalCount', { n: picked.length, max: MAX_GOALS })}</p>
              {GOAL_GROUPS.map((g) => (
                <div key={g.title} role="group" aria-label={t(g.title)} className="flex flex-col gap-2.5">
                  <h2 className="m-0 text-xs font-bold uppercase tracking-[.12em] text-muted">{t(g.title)}</h2>
                  {g.goals.map((o) => (
                    <ChoiceRow key={o.id} indicator="check" selected={picked.includes(o.id)} disabled={!picked.includes(o.id) && picked.length >= MAX_GOALS} onSelect={() => toggleGoal(o.id)}>{t(o.label)}</ChoiceRow>
                  ))}
                </div>
              ))}
            </div>
          ) : null}

          {key === 'area' ? (
            <div role="group" aria-label={title} className="flex flex-col gap-2.5">
              {AREA_OPTIONS.map((a) => (
                <ChoiceRow key={a.id} indicator="radio" selected={a.available && area === a.id} disabled={!a.available} badge={a.available ? undefined : t('common.comingSoon')} onSelect={() => a.id === 'CM' && setArea('CM')}>
                  {t(`boards.area.${a.id}`)}
                </ChoiceRow>
              ))}
            </div>
          ) : null}

          {key === 'start' ? (
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
            {step < last || profileOnly ? (
              <>
                <Button loading={busy} disabled={!value} onClick={() => void next(false)}>{t('onboarding.next')}</Button>
                {key === 'userType' ? null : <Button variant="secondary" disabled={busy} onClick={() => void next(true)}>{t('onboarding.skipStep')}</Button>}
              </>
            ) : (
              <Button loading={busy} disabled={!path} onClick={() => void finish(path)}>{t('onboarding.finish')}</Button>
            )}
            {key === 'userType' ? null : <Button variant="secondary" disabled={busy} onClick={() => void finish()}>{t('onboarding.skipAll')}</Button>}
          </div>
        </div>
      </main>
    </div>
  );
}
