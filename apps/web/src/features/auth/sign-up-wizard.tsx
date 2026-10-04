'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isValidName, isValidPassword, normalizeName, passwordStrength, type Goal, type Stage } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, Checkbox, ChoiceChip, Input, PasswordMeter, Stepper } from '@remoa/ui';
import { signUp } from '@/server/auth/actions';
import { identify, track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { attributeReferral } from '@/features/referral/invite/actions';
import { APP_HOME, safeNext } from '@/lib/safe-next';
import { goalGroups, stageOptions } from '../account/profile/profile-section';
import { FieldError, PasswordField } from './password-field';
import { generalMessage, validEmail } from './sign-in-form';

type Values = { email: string; password: string; name: string; stage: Stage | null; goal: Goal | null; consent: boolean };
type Errs = Partial<Record<'email' | 'password' | 'name' | 'consent' | 'general', string>>;

/** `referred`: there is an `rf` cookie (FR-15 shows the consent line; FR-16 attributes right after sign-up). */
export function SignUpWizard({ next, referred = false }: { next?: string; referred?: boolean }) {
  const router = useRouter();
  const target = safeNext(next);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []); // `data-ready`: typing before hydration is wiped by the controlled inputs (e2e waits for it)
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Values>({ email: '', password: '', name: '', stage: null, goal: null, consent: false });
  const [errs, setErrs] = useState<Errs>({});
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((p) => ({ ...p, [k]: val }));

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
    if (s === 1) return name && !isValidName(name) ? { name: t('auth.about.nameInvalid') } : {};
    return v.consent ? {} : { consent: t('auth.review.consentRequired') };
  }

  async function submit() {
    setBusy(true);
    const res = await signUp({ email: v.email, password: v.password, ...(name ? { name } : {}) });
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
    const { data } = await createClient().auth.getUser();
    if (data.user) {
      identify(data.user.id);
      if (referred) {
        const r = await attributeReferral().catch(() => null); // never blocks the sign-up (D-383)
        if (r) track('referral_signup', { valid: r.attributed, method: 'password' });
      }
      // ponytail: signUpInputSchema só leva e-mail/senha/nome; momento e objetivo vão por PATCH /v1/account/profile (best-effort).
      if (v.stage || v.goal) {
        const body = { ...(v.stage ? { stage: v.stage } : {}), ...(v.goal ? { goal: v.goal } : {}) };
        await api('/v1/account/profile', { method: 'PATCH', body: JSON.stringify(body) }).catch(() => null);
      }
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

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate data-ready={hydrated || undefined} className="flex flex-col gap-5">
      <Stepper aria-label={t('auth.steps.label')} doneLabel={t('auth.steps.done')} current={step} steps={[t('auth.steps.account'), t('auth.steps.about'), t('auth.steps.confirm')]} />
      <div className="flex flex-col gap-1.5">
        <h1 ref={headingRef} tabIndex={-1} className="m-0 font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-text outline-none">{t(titles[step]!)}</h1>
        <p className="m-0 text-[15px] text-muted">{t(subs[step]!)}</p>
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
          <Input label={t('auth.about.name')} autoComplete="name" value={v.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errs.name} aria-describedby={errs.name ? 'su-name-err' : undefined} />
          <FieldError id="su-name-err">{errs.name}</FieldError>
          <div className="flex flex-col gap-2">
            <span className="font-bold text-ink">{t('auth.about.stage')}</span>
            <ChoiceChip label={t('auth.about.stage')} options={stageOptions()} value={v.stage} onValueChange={(s) => set('stage', s as Stage)} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-bold text-ink">{t('auth.about.goal')}</span>
            {goalGroups().map((g) => (
              <ChoiceChip key={g.label} label={`${t('auth.about.goal')}: ${g.label}`} options={g.options} value={g.options.some((o) => o.value === v.goal) ? v.goal : null} onValueChange={(x) => set('goal', x as Goal)} />
            ))}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-4">
          <dl className="m-0 rounded-field border border-border px-4">
            {row(t('auth.review.emailRow'), v.email)}
            {row(t('auth.review.nameRow'), name)}
            {row(t('auth.review.stageRow'), stageOptions().find((o) => o.value === v.stage)?.label ?? '')}
            {row(t('auth.review.goalRow'), goalGroups().flatMap((g) => g.options).find((o) => o.value === v.goal)?.label ?? '')}
          </dl>
          <Checkbox label={t('auth.review.consent')} checked={v.consent} onCheckedChange={(c) => set('consent', c === true)} aria-describedby={errs.consent ? 'su-consent-err' : undefined} />
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
        <Link href={target === APP_HOME ? '/entrar' : `/entrar?next=${encodeURIComponent(target)}`} className="inline-flex min-h-11 min-w-11 items-center justify-center font-bold text-primary-deep underline">
          {t('auth.signUp.toSignIn')}
        </Link>
      </p>
    </form>
  );
}
