'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useNavigate } from '@/features/shell/use-navigate';
import { isValidName, isValidPassword, normalizeName, passwordStrength, TRIAL_DAYS } from '@remoa/contracts/constants';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button, Checkbox, Input, PasswordMeter, SkeletonBlock, Stepper } from '@remoa/ui';
import { signUp } from '@/server/auth/actions';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { attributeReferral } from '@/features/referral/invite/actions';
import { APP_HOME, ONBOARDING_HOME, safeNext } from '@/lib/safe-next';
import { emptyPersonal, type PersonalErrors, type PersonalValues } from '../account/profile/personal-basics';
import { ConfirmEmail } from './confirm-email';
import { FieldError, PasswordField } from './password-field';
import { generalMessage, validEmail } from './sign-in-form';

const t = withStrings({ account: more.account, personal: more.personal });

// P-514 (D-1080): the personal-data form (Radix Select, zod schemas, ~45 KB with its deps) is step 2; it downloads after the first paint.
const loadPersonal = () => import('../account/profile/personal-fields');
type PersonalModule = Awaited<ReturnType<typeof loadPersonal>>;
const PersonalFields = dynamic(() => loadPersonal().then((m) => m.PersonalFields), { loading: () => <SkeletonBlock height={320} radius={16} /> });

type Values = { email: string; password: string; name: string; personal: PersonalValues; consent: boolean };
const NO_TYPE = { userType: false } as const; // "Você é?" lives in the onboarding
type Errs = PersonalErrors & Partial<Record<'email' | 'password' | 'name' | 'consent' | 'general', string>>;

/** `referred`: there is an `rf` cookie (FR-15 shows the consent line; FR-16 attributes right after sign-up). */
const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;
/** P-0xx: the consent text links to /termos-de-uso and /politica-de-privacidade (new tab); the string keeps {terms}/{privacy} placeholders. */
const consentLabel = t('auth.review.consent', { terms: '\u0001T', privacy: '\u0001P' })
  .split(/(\u0001[TP])/)
  .map((part, i) =>
    part === '\u0001T' ? <a key={i} href="/termos-de-uso" {...ext}>{t('auth.review.consentTerms')}</a>
    : part === '\u0001P' ? <a key={i} href="/politica-de-privacidade" {...ext}>{t('auth.review.consentPrivacy')}</a>
    : part,
  );

const addressLine = ({ address: a }: PersonalValues) =>
  [a.street && `${a.street}${a.number ? `, ${a.number}` : ''}`, a.complement, a.district, a.city && `${a.city}${a.uf ? `/${a.uf}` : ''}`, a.cep].filter(Boolean).join(' · ');

export function SignUpWizard({ next, referred = false }: { next?: string; referred?: boolean }) {
  const [navigating, router] = useNavigate();
  const target = next ? safeNext(next) : ONBOARDING_HOME; // a new account goes to the onboarding unless a deep link was asked for
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []); // `data-ready`: typing before hydration is wiped by the controlled inputs (e2e waits for it)
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Values>({ email: '', password: '', name: '', personal: emptyPersonal, consent: false });
  const [errs, setErrs] = useState<Errs>({});
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((p) => ({ ...p, [k]: val }));
  const [personalMod, setPersonalMod] = useState<PersonalModule | null>(null);
  useEffect(() => void loadPersonal().then(setPersonalMod, () => undefined), []);
  // until the form module arrives, "Sobre você" counts as incomplete (the button stays off, never a submit without validation)
  const validatePersonal: PersonalModule['validatePersonal'] = (p, o) => personalMod?.validatePersonal(p, o) ?? { errors: { phone: '' }, payload: null };

  // Foco: primeiro campo ao abrir; ao trocar de passo, o título do passo (anuncia a mudança).
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      formRef.current?.querySelector<HTMLInputElement>('input[type="email"]')?.focus();
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const strength = passwordStrength(v.password);
  const name = normalizeName(v.name);

  function validate(s: number): Errs {
    if (s === 0) {
      return {
        ...(validEmail(v.email) ? {} : { email: t('auth.emailInvalid') }),
        ...(isValidPassword(v.password) ? {} : { password: t('auth.passwordWeak') }),
      };
    }
    if (s === 1) return { ...(!name ? { name: t('auth.about.nameRequired') } : !isValidName(name) ? { name: t('auth.about.nameInvalid') } : {}), ...validatePersonal(v.personal, NO_TYPE).errors };
    return v.consent ? {} : { consent: t('auth.review.consentRequired') };
  }

  // G20: "Continuar" in "Sobre você" only enables with a valid name and phone; invalid (not empty) values are flagged while typing.
  const aboutErrs = step === 1 ? validate(1) : {};
  const aboutBlocked = Object.keys(aboutErrs).some((k) => k === 'name' || k === 'phone');
  const shown: Errs = { ...errs, ...(!v.name.trim() ? {} : aboutErrs.name ? { name: aboutErrs.name } : {}), ...(!v.personal.phone.trim() ? {} : aboutErrs.phone ? { phone: aboutErrs.phone } : {}) };

  async function submit() {
    setBusy(true);
    const res = await signUp({ email: v.email, password: v.password, name });
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
    const { data } = await (await import('@/lib/supabase/client')).createClient().auth.getUser();
    if (!data.user) { setPendingEmail(v.email); setBusy(false); return; } // e-mail confirmation required: the link opens /auth/callback -> onboarding
    {
      if (referred) {
        const r = await attributeReferral().catch(() => null); // never blocks the sign-up (D-383)
        if (r) track('referral_signup', { valid: r.attributed, method: 'password' });
      }
      // signUpInputSchema só leva e-mail/senha/nome; os dados pessoais vão por PATCH /v1/account/profile, sem nulls (D-571; best-effort: vale também no perfil).
      const personal = validatePersonal(v.personal, NO_TYPE).payload;
      if (personal && Object.keys(personal).length) await api('/v1/account/profile', { method: 'PATCH', body: JSON.stringify(personal) }).catch(() => null);
    }
    router.push(target);
    router.refresh();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const found = validate(step);
    setErrs(found);
    if (Object.keys(found).length) {
      if (step === 0) formRef.current?.querySelector<HTMLInputElement>(found.email ? 'input[type="email"]' : 'input[autocomplete="new-password"]')?.focus();
      return;
    }
    if (step < 2) setStep(step + 1);
    else void submit();
  }

  const titles = ['auth.signUp.title', 'auth.about.title', 'auth.review.title'] as const;
  const subs = ['auth.signUp.subtitle', 'auth.about.subtitle', 'auth.review.subtitle'] as const;
  const row = (label: string, value: string) => (
    <div className="flex items-baseline justify-between gap-4 border-t border-divider py-3 first:border-t-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="m-0 min-w-0 break-words text-right text-[15px] font-bold text-text">{value || t('auth.review.empty')}</dd>
    </div>
  );

  if (pendingEmail) return <ConfirmEmail email={pendingEmail} />;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate data-ready={hydrated || undefined} className="flex flex-col gap-5">
      <Stepper aria-label={t('auth.steps.label')} doneLabel={t('auth.steps.done')} current={step} steps={[t('auth.steps.account'), t('auth.steps.about'), t('auth.steps.confirm')]} />
      <div className="flex flex-col gap-1.5">
        <h1 ref={headingRef} tabIndex={-1} className="m-0 font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-text outline-none">{t(titles[step]!)}</h1>
        <p className="m-0 text-[15px] text-muted">{t(subs[step]!, { days: TRIAL_DAYS })}</p>
      </div>

      {step === 0 ? (
        <div className="flex flex-col gap-4">
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
        </div>
      ) : null}

      {step === 1 ? (
        <div className="flex flex-col gap-5">
          <Input label={t('auth.about.name')} autoComplete="name" value={v.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!shown.name} aria-describedby={shown.name ? 'su-name-err' : undefined} required />
          <FieldError id="su-name-err">{shown.name}</FieldError>
          <PersonalFields value={v.personal} onChange={(p) => set('personal', p)} errors={shown} idPrefix="su" hideUserType />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-4">
          <dl className="m-0 rounded-field border border-border px-4">
            {row(t('auth.review.emailRow'), v.email)}
            {row(t('auth.review.nameRow'), name)}
            {row(t('auth.review.sexRow'), v.personal.sex ? t(`personal.sex.${v.personal.sex}`) : '')}
            {row(t('auth.review.phoneRow'), v.personal.phone)}
            {row(t('auth.review.addressRow'), addressLine(v.personal))}
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
        <Button key={step === 2 ? 'create' : 'next'} type="submit" size="touch" disabled={step === 1 && aboutBlocked} loading={busy || navigating} loadingLabel={t('common.loading')}>
          {t(step === 2 ? 'auth.signUp.submit' : 'auth.steps.next')}
        </Button>
      </div>
      <p className="m-0 text-sm text-muted">
        {t('auth.signUp.hasAccount')}{' '}
        <Link href={target === APP_HOME ? '/entrar' : `/entrar?next=${encodeURIComponent(target)}`} className="inline-flex min-h-11 min-w-11 items-center justify-center font-bold text-primary-deep underline">
          {t('auth.signUp.toSignIn')}
        </Link>
      </p>
    </form>
  );
}
