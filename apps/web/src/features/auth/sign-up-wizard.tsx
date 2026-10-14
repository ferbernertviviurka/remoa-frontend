'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { profileCapabilities, type HealthCourseCode } from '@remoa/contracts';
import { isValidName, isValidPassword, normalizeName, passwordStrength, TRIAL_DAYS } from '@remoa/contracts/constants';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button, buttonVariants, Checkbox, focusRing, Input, PasswordMeter, Stepper } from '@remoa/ui';
import { signUp } from '@/server/auth/actions';
import { track } from '@/lib/analytics';
import { attributeReferral } from '@/features/referral/invite/actions';
import { APP_HOME, ONBOARDING_HOME, safeNext } from '@/lib/safe-next';
import { suggestReference } from '@/features/study-profile/api';
import { applyCourse, courseName, emptyDraft, focusTitle, newSuggestions, validateDraft, visibleFields, type StudyDraft, type StudyErrors } from '@/features/study-profile/autofill';
import { useCourses, useGoals } from '@/features/study-profile/reference';
import { StudyFields } from '@/features/study-profile/study-fields';
import { ConfirmEmail } from './confirm-email';
import { FieldError, PasswordField } from './password-field';
import { setSignupAside } from './signup-aside';
import { planHref, type SignupPlan } from './signup-params';
import { generalMessage, validEmail } from './sign-in-form';

const t = withStrings({ account: more.account, studyProfile: more.studyProfile });

type Values = { email: string; password: string; name: string; consent: boolean };
type Errs = StudyErrors & Partial<Record<'email' | 'password' | 'name' | 'consent' | 'general', string>>;

/** FR-13: steps 1-2 survive a reload in this tab; never the password (nor the council number). */
const DRAFT = 'remoa:signup-draft';
type Draft = { email: string; name: string; study: StudyDraft };
function readDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
function writeDraft(d: Draft | null) {
  try {
    if (d) sessionStorage.setItem(DRAFT, JSON.stringify(d));
    else sessionStorage.removeItem(DRAFT);
  } catch {
    // private mode / blocked storage: the form just does not survive a reload
  }
}

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;
/** P-0xx: the consent text links to /termos-de-uso and /politica-de-privacidade (new tab); the string keeps {terms}/{privacy} placeholders. */
const consentLabel = t('auth.review.consent', { terms: '\u0001T', privacy: '\u0001P' })
  .split(/(\u0001[TP])/)
  .map((part, i) =>
    part === '\u0001T' ? <a key={i} href="/termos-de-uso" {...ext}>{t('auth.review.consentTerms')}</a>
    : part === '\u0001P' ? <a key={i} href="/politica-de-privacidade" {...ext}>{t('auth.review.consentPrivacy')}</a>
    : part,
  );
const toOnboarding = (next?: string) => (next ? `${ONBOARDING_HOME}?next=${encodeURIComponent(next)}` : ONBOARDING_HOME);
const cta = `inline-flex min-h-11 items-center justify-center rounded-btn px-5 font-display text-[15px] font-extrabold no-underline ${focusRing}`;

/**
 * F35 FR-8..FR-13: Conta (nome, e-mail, senha) / Seu estudo / Revisar. `plan` and `course` come from the Landing (`?plano=&curso=`).
 * `referred`: there is an `rf` cookie (F18 FR-15 shows the consent line; FR-16 attributes right after sign-up).
 */
export function SignUpWizard({ next, referred = false, plan, course }: { next?: string; referred?: boolean; plan?: SignupPlan; course?: HealthCourseCode }) {
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Values>({ email: '', password: '', name: '', consent: false });
  const [study, setStudy] = useState<StudyDraft>(emptyDraft);
  const [errs, setErrs] = useState<Errs>({});
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const preselected = useRef(false);
  const courses = useCourses();
  const allGoals = useGoals();
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((p) => ({ ...p, [k]: val }));

  useEffect(() => {
    const d = readDraft();
    if (d) {
      setV((p) => ({ ...p, email: d.email ?? '', name: d.name ?? '' }));
      if (d.study) { setStudy({ ...emptyDraft, ...d.study, councilNumber: '' }); preselected.current = !!d.study.course; }
    }
    setHydrated(true); // `data-ready`: typing before hydration is wiped by the controlled inputs (e2e waits for it)
  }, []);
  useEffect(() => {
    if (hydrated && !done) writeDraft({ email: v.email, name: v.name, study: { ...study, councilNumber: '' } });
  }, [hydrated, done, v.email, v.name, study]);
  // ?curso= from the Landing preselects the course once the list arrives (a restored draft wins).
  useEffect(() => {
    if (preselected.current || !course || !hydrated) return;
    const c = courses.find((x) => x.code === course);
    if (!c) return;
    preselected.current = true;
    setStudy((s) => (s.course ? s : applyCourse(s, c)));
  }, [course, courses, hydrated]);
  useEffect(() => {
    setSignupAside(study.course && study.course !== 'not_health' ? { course: courseName(study), showEnamed: study.course === 'medicine' && study.situation === 'graduacao' } : null);
  }, [study]);
  useEffect(() => () => setSignupAside(null), []);

  // Foco: primeiro campo ao abrir; ao trocar de passo, o título do passo (anuncia a mudança).
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      formRef.current?.querySelector<HTMLInputElement>('input')?.focus();
      return;
    }
    headingRef.current?.focus();
  }, [step, done]);

  const strength = passwordStrength(v.password);
  const name = normalizeName(v.name);
  const caps = profileCapabilities(study.course ? { course: study.course, situation: study.situation, source: 'signup' } : null);
  const planDest = plan ? planHref(plan) : null;
  const target = planDest ?? (next ? safeNext(next) : caps.showEnamed ? '/app/cobertura' : null);

  function validate(s: number): Errs {
    if (s === 0) {
      return {
        ...(!name ? { name: t('auth.about.nameRequired') } : !isValidName(name) ? { name: t('auth.about.nameInvalid') } : {}),
        ...(validEmail(v.email) ? {} : { email: t('auth.emailInvalid') }),
        ...(isValidPassword(v.password) ? {} : { password: t('auth.passwordWeak') }),
      };
    }
    if (s === 1) {
      const found = validateDraft(study, 'signup').errors;
      return Object.keys(found).length ? { ...found, general: t('studyProfile.errors.step') } : {};
    }
    return v.consent ? {} : { consent: t('auth.review.consentRequired') };
  }

  async function submit() {
    setBusy(true);
    const input = validateDraft(study, 'signup').input ?? undefined;
    const res = await signUp({ email: v.email, password: v.password, name, studyProfile: input, next: toOnboarding(target ?? undefined) });
    if (!res.ok) {
      const code = res.error.code;
      // O erro volta ao passo do campo: e-mail/senha moram no passo 1.
      if (code === 'conflict') { setErrs({ email: generalMessage(code, 'signUp') }); setStep(0); }
      else if (code === 'validation') { setErrs({ email: t('auth.emailInvalid') }); setStep(0); }
      else setErrs({ general: generalMessage(code, 'signUp') });
      setBusy(false);
      return;
    }
    track('signup', { method: 'password' });
    writeDraft(null);
    const { data } = await (await import('@/lib/supabase/client')).createClient().auth.getUser();
    if (!data.user) { setDone(true); setPendingEmail(v.email); setBusy(false); return; } // e-mail confirmation: the link opens /auth/callback -> onboarding
    if (referred) {
      const r = await attributeReferral().catch(() => null); // never blocks the sign-up (D-383)
      if (r) track('referral_signup', { valid: r.attributed, method: 'password' });
    }
    if (input) for (const s of newSuggestions(input, null)) void suggestReference(s).catch(() => null); // FR-6: curation queue, best-effort
    setDone(true);
    setBusy(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const found = validate(step);
    setErrs(found);
    if (Object.keys(found).length) {
      if (step === 0) formRef.current?.querySelector<HTMLInputElement>(found.name ? 'input[autocomplete="name"]' : found.email ? 'input[type="email"]' : 'input[autocomplete="new-password"]')?.focus();
      return;
    }
    if (step < 2) setStep(step + 1);
    else void submit();
  }

  if (pendingEmail) return <ConfirmEmail email={pendingEmail} />;

  const goalNames = [...study.goals.map((g) => allGoals.find((x) => x.code === g)?.name ?? g), ...study.customGoals];
  const focusMain = goalNames.length ? goalNames.join(' · ') : t('studyProfile.focus.noGoal');

  if (done) {
    const first = caps.showEnamed
      ? { label: t('studyProfile.signup.ctaEnamed'), href: toOnboarding('/app/cobertura') }
      : { label: t('studyProfile.signup.ctaMap'), href: toOnboarding(next ? safeNext(next) : undefined) };
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 ref={headingRef} tabIndex={-1} className="m-0 font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-text outline-none">{t('studyProfile.signup.doneTitle', { name })}</h1>
          <p className="m-0 text-[15px] text-muted">{t('studyProfile.signup.doneBody', { title: focusTitle(study), focus: focusMain })}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {planDest && plan ? <Link href={toOnboarding(planDest)} className={`${cta} ${buttonVariants.primary}`}>{t('studyProfile.signup.ctaPlan', { plan: t(`studyProfile.signup.plans.${plan}`) })}</Link> : null}
          <Link href={first.href} className={`${cta} ${planDest ? buttonVariants.secondary : buttonVariants.primary}`}>{first.label}</Link>
        </div>
      </div>
    );
  }

  const titles = ['studyProfile.signup.accountTitle', 'studyProfile.signup.studyTitle', 'studyProfile.signup.reviewTitle'] as const;
  const show = visibleFields(study);
  const instLine = study.institution ? study.institution.name : study.institutionText;
  const place = study.city ? `${study.city}${study.uf ? `, ${study.uf}` : ''}` : '';
  const empty = t('studyProfile.summary.empty');
  const rows: [string, string][] = [
    [t('auth.review.nameRow'), name],
    [t('auth.review.emailRow'), v.email],
    [t('studyProfile.summary.situation'), t(`studyProfile.situationShort.${study.situation}`)],
    [t('studyProfile.summary.course'), courseName(study)],
    [t('studyProfile.summary.institution'), instLine ? `${instLine}${place ? ` · ${place}` : ''}` : empty],
    [t('studyProfile.summary.period'), show.period ? t('studyProfile.period.value', { n: study.period }) : empty],
    [t('studyProfile.summary.council'), study.council ? `${study.council}${show.councilNumber && study.councilNumber.trim() ? ` · ${study.councilNumber.trim()}` : ''}` : empty],
    [t('studyProfile.summary.goals'), goalNames.join(', ') || empty],
  ];

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate data-ready={hydrated || undefined} className="flex flex-col gap-5">
      <Stepper aria-label={t('auth.steps.label')} doneLabel={t('auth.steps.done')} current={step} steps={[t('studyProfile.signup.steps.account'), t('studyProfile.signup.steps.study'), t('studyProfile.signup.steps.review')]} />
      <div className="flex flex-col gap-1.5">
        <h1 ref={headingRef} tabIndex={-1} className="m-0 font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-text outline-none">{t(titles[step]!)}</h1>
        <p className="m-0 text-[15px] text-muted">{step === 1 ? t('studyProfile.intro') : t('auth.signUp.subtitle', { days: TRIAL_DAYS })}</p>
      </div>

      {step === 0 ? (
        <div className="flex flex-col gap-4">
          <Input label={t('studyProfile.signup.name')} autoComplete="name" value={v.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errs.name} aria-describedby={errs.name ? 'su-name-err' : undefined} required />
          <FieldError id="su-name-err">{errs.name}</FieldError>
          <Input label={t('auth.email')} type="email" autoComplete="email" inputMode="email" placeholder={t('auth.emailPlaceholder')} value={v.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!errs.email} aria-describedby={errs.email ? 'su-email-err' : undefined} />
          <FieldError id="su-email-err">{errs.email}</FieldError>
          <PasswordField label={t('auth.password')} autoComplete="new-password" value={v.password} onChange={(e) => set('password', e.target.value)} aria-invalid={!!errs.password} aria-describedby={errs.password ? 'su-pw-err' : undefined} />
          <FieldError id="su-pw-err">{errs.password}</FieldError>
          <PasswordMeter
            score={strength.score}
            label={t(strength.score === 0 ? 'account.security.strength.empty' : `account.security.strength.${strength.label}`)}
            doneLabel={t('account.security.ruleDone')}
            todoLabel={t('account.security.rulePending')}
            checks={[
              { id: 'length', label: t('account.security.rules.length'), ok: strength.checks.minLength },
              { id: 'mix', label: t('account.security.rules.mix'), ok: strength.checks.lettersAndNumbers },
              { id: 'long', label: t('account.security.rules.long'), ok: strength.checks.long },
            ]}
          />
          {plan ? (
            <p className="m-0 rounded-field border border-border bg-primary-tint px-4 py-3 text-sm text-primary-deep">
              <strong>{t('studyProfile.signup.plan')}</strong> {t('studyProfile.signup.planRest', { plan: t(`studyProfile.signup.plans.${plan}`) })}
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 1 ? <StudyFields value={study} onChange={setStudy} errors={errs} disabled={busy} /> : null}

      {step === 2 ? (
        <div className="flex flex-col gap-4">
          <dl className="m-0 rounded-field border border-border px-4">
            {rows.map(([k, val]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 border-t border-divider py-3 first:border-t-0">
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="m-0 min-w-0 break-words text-right text-[15px] font-bold text-text">{val || t('auth.review.empty')}</dd>
              </div>
            ))}
          </dl>
          <div className={`flex flex-col gap-1.5 rounded-field border-2 px-3 ${errs.consent ? 'border-review' : 'border-border'}`}>
            <Checkbox label={consentLabel} checked={v.consent} onCheckedChange={(c) => set('consent', c === true)} invalid={!!errs.consent} aria-describedby={errs.consent ? 'su-consent-err' : undefined} />
          </div>
          <FieldError id="su-consent-err">{errs.consent}</FieldError>
          {referred ? <p className="m-0 text-sm text-muted">{t('referral.consent.nameVisibility')}</p> : null}
        </div>
      ) : null}

      {errs.general ? <p role="alert" className="m-0 text-sm font-semibold text-review-text">{errs.general}</p> : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {step > 0 ? (
          <Button type="button" variant="secondary" size="touch" disabled={busy} onClick={() => { setErrs({}); setStep(step - 1); }}>
            {t('auth.steps.back')}
          </Button>
        ) : <span />}
        <Button key={step === 2 ? 'create' : 'next'} type="submit" size="touch" loading={busy} loadingLabel={t('common.loading')}>
          {t(step === 2 ? 'auth.signUp.submit' : 'auth.steps.next')}
        </Button>
      </div>
      <p className="m-0 text-sm text-muted">
        {t('auth.signUp.hasAccount')}{' '}
        <Link href={!next || safeNext(next) === APP_HOME ? '/entrar' : `/entrar?next=${encodeURIComponent(safeNext(next))}`} className="inline-flex min-h-11 min-w-11 items-center justify-center font-bold text-primary-deep underline">
          {t('auth.signUp.toSignIn')}
        </Link>
      </p>
    </form>
  );
}
