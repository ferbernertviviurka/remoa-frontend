'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { isValidName, isValidPassword, normalizeName } from '@remoa/contracts';
import { t } from '@remoa/strings/referral';
import { Avatar, Button, Icon, Input, buttonVariants } from '@remoa/ui';
// D-417: the barrel `@remoa/ui` loses the referral exports under Next's optimizePackageImports (file names clash: hero, copy-field); direct entry.
import { ProgressTracker, SuccessRing } from '@remoa/ui';
import { signInWithGoogle, signUp } from '@/server/auth/actions';
import { track } from '@/lib/analytics';
import { FieldError, PasswordField } from '@/features/auth/password-field';
import { validEmail } from '@/features/auth/sign-in-form';
import { attributeReferral, claimInvite } from './actions';

const googleOn = process.env.NEXT_PUBLIC_AUTH_GOOGLE === '1';
export const FIRST_MAP = '/app/mapas/novo';
const link = `inline-flex min-h-11 items-center rounded-btn px-4 font-display text-[15px] font-bold no-underline`;

export type InviteViewProps = { valid: boolean; code: string; inviterName: string | null; loggedIn: boolean };

/** FR-14: left column (who invited, title, 3-step tracker) + right card (sign-up / success / already logged in). */
export function InviteView({ valid, code, inviterName, loggedIn }: InviteViewProps) {
  const [done, setDone] = useState(false); // sign-up sets the session cookie and Next re-renders with `loggedIn`: `done` must win over it
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
    track('referral_invite_opened', { valid });
    if (valid && !loggedIn) void claimInvite(code); // server re-validates and writes the `rf` cookie (D-416)
  }, [valid, loggedIn, code]);

  const name = inviterName ?? '';
  const steps = [
    { id: 'account', label: t('referral.invite.step1') },
    { id: 'map', label: t('referral.invite.step2') },
    { id: 'win', label: t(valid ? 'referral.invite.step3Valid' : 'referral.invite.step3Invalid') },
  ];

  return (
    <main className="mx-auto grid w-full max-w-[1280px] flex-1 items-center gap-10 px-4 py-10 sm:px-10 sm:py-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
      <div className="flex flex-col gap-6">
        {valid ? (
          <span className="flex h-14 items-center gap-3 self-start rounded-pill border border-divider bg-surface pl-2 pr-5 font-display text-base font-bold shadow-[0_12px_30px_rgba(36,26,92,.1)]">
            <Avatar name={name || t('referral.invite.validLabelAnon')} fallback={name ? name.charAt(0).toUpperCase() : <Icon name="user" size={18} />} color={0} size={40} plain />
            {name ? t('referral.invite.validLabel', { name }) : t('referral.invite.validLabelAnon')}
          </span>
        ) : null}
        <h1 className="m-0 font-display text-[40px] font-extrabold leading-[1.03] tracking-[-0.04em] text-text sm:text-[56px] lg:text-[64px]">{t(valid ? 'referral.invite.validTitle' : 'referral.invite.invalidTitle')}</h1>
        <p className="m-0 max-w-[560px] text-lg leading-normal text-muted sm:text-xl">{t(valid ? 'referral.invite.validSubtitle' : 'referral.invite.invalidSubtitle')}</p>
        <ProgressTracker aria-label={t('referral.invite.trackerLabel')} doneLabel={t('referral.invite.trackerDone')} steps={steps} current={done ? 2 : 1} />
        {valid ? (
          <p className="m-0 flex items-center gap-3 text-[15px] text-ink">
            <span aria-hidden="true" className="relative block h-11 w-24 shrink-0">
              <span className="absolute left-0 top-0"><Avatar name="" fallback={name ? name.charAt(0).toUpperCase() : '·'} color={0} size={44} plain /></span>
              <span className="absolute left-[52px] top-0 flex size-11 items-center justify-center rounded-full border-2 border-dashed border-primary bg-surface text-primary"><Icon name="plus" size={18} /></span>
            </span>
            {name ? t('referral.invite.validNote', { name }) : t('referral.invite.validNoteAnon')}
          </p>
        ) : null}
      </div>

      <div className="rounded-[36px] border border-divider bg-surface p-6 shadow-[0_30px_80px_rgba(36,26,92,.14)] sm:p-[34px]">
        {!done && loggedIn ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <h2 className="m-0 font-display text-[30px] font-extrabold tracking-[-0.03em]">{t('referral.invite.alreadyLoggedIn')}</h2>
            <p className="m-0 text-muted">{t('referral.invite.alreadyLoggedInDesc')}</p>
            <Link href="/app/hoje" className={`${link} ${buttonVariants.primary}`}>{t('referral.invite.goToApp')}</Link>
          </div>
        ) : done ? (
          <div role="status" className="flex flex-col items-center gap-3.5 py-2.5 text-center">
            <SuccessRing />
            <h2 className="m-0 font-display text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em]">{t('referral.invite.successTitle')}</h2>
            <p className="m-0 text-muted">{valid ? (name ? t('referral.invite.successDesc', { name }) : t('referral.invite.successDescAnon')) : t('referral.invite.successDescInvalid')}</p>
            <Link href={FIRST_MAP} className={`${link} ${buttonVariants.primary} gap-2.5 px-7`}>
              {t('referral.invite.successCta')}
              <Icon name="right" size={20} />
            </Link>
          </div>
        ) : (
          <InviteForm valid={valid} code={code} hydrated={hydrated} onDone={() => setDone(true)} />
        )}
      </div>
    </main>
  );
}

function InviteForm({ valid, code, hydrated, onDone }: { valid: boolean; code: string; hydrated: boolean; onDone: () => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errs, setErrs] = useState<{ name?: string; email?: string; password?: string; general?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const found = {
      ...(isValidName(normalizeName(fullName)) ? {} : { name: t('auth.about.nameInvalid') }),
      ...(validEmail(email) ? {} : { email: t('referral.invite.errors.invalidEmail') }),
      ...(isValidPassword(password) ? {} : { password: t('auth.passwordWeak') }),
    };
    setErrs(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    const res = await signUp({ email, password, name: normalizeName(fullName) });
    if (!res.ok) {
      setErrs(res.error.code === 'conflict' ? { email: t('referral.invite.emailTaken') } : { general: t('referral.invite.signUpFailed') });
      setBusy(false);
      return;
    }
    track('signup', { method: 'password' });
    const { data } = await (await import('@/lib/supabase/client')).createClient().auth.getUser();
    // D-383: with a session already (no e-mail confirmation) attribute now; otherwise `/auth/callback` does it. Never blocks.
    if (data.user && valid) await attributeReferral().catch(() => null);
    track('referral_signup', { valid, method: 'password' });
    setBusy(false);
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate data-ready={hydrated || undefined} className="flex flex-col gap-[18px]">
      <h2 className="m-0 font-display text-[30px] font-extrabold tracking-[-0.03em]">{t('referral.invite.formTitle')}</h2>
      {googleOn ? (
        <>
          <Button type="button" variant="secondary" size="touch" disabled={busy} onClick={() => void signInWithGoogle({ next: FIRST_MAP, ...(valid ? { rf: code } : {}) })}>
            {t('referral.invite.googleCta')}
          </Button>
          <span className="flex items-center gap-3 text-[13px] text-muted">
            <span aria-hidden="true" className="h-px grow bg-divider" />{t('referral.invite.emailOrSeparator')}<span aria-hidden="true" className="h-px grow bg-divider" />
          </span>
        </>
      ) : null}
      <Input label={t('account.profile.name')} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} aria-invalid={!!errs.name} aria-describedby={errs.name ? 'iv-name-err' : undefined} />
      <FieldError id="iv-name-err">{errs.name}</FieldError>
      <Input label={t('referral.invite.emailLabel')} type="email" autoComplete="email" inputMode="email" placeholder={t('referral.invite.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errs.email} aria-describedby={errs.email ? 'iv-email-err' : undefined} />
      <FieldError id="iv-email-err">{errs.email}</FieldError>
      <PasswordField label={t('referral.invite.passwordLabel')} autoComplete="new-password" placeholder={t('referral.invite.passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errs.password} aria-describedby={errs.password ? 'iv-pw-err' : undefined} />
      <FieldError id="iv-pw-err">{errs.password}</FieldError>
      {errs.general ? <p role="alert" className="m-0 text-sm font-semibold text-review-text">{errs.general}</p> : null}
      <Button type="submit" size="cta" icon={<Icon name="sparkle" size={20} />} loading={busy} loadingLabel={t('common.loading')}>
        {t(valid ? 'referral.invite.createCta' : 'referral.invite.createCtaInvalid')}
      </Button>
      <p className="m-0 text-center text-[12.5px] leading-normal text-muted">{t(valid ? 'referral.invite.termsConsent' : 'referral.invite.termsConsentNeutral')}</p>
    </form>
  );
}
