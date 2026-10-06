'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useNavigate } from '@/features/shell/use-navigate';
import type { ErrorCode } from '@remoa/contracts';
import { isValidEmail } from '@remoa/contracts/constants';
import { t } from '@remoa/strings';
import { Button, Input, Separator } from '@remoa/ui';
import { sendMagicLink, signIn, signInWithGoogle, type AuthResult } from '@/server/auth/actions';
import { track } from '@/lib/analytics';
import { APP_HOME, safeNext } from '@/lib/safe-next';
import { FieldError, PasswordField } from './password-field';

const googleOn = process.env.NEXT_PUBLIC_AUTH_GOOGLE === '1';
export const validEmail = isValidEmail; // = signUpInputSchema.shape.email, without zod (CCR-058)

export function generalMessage(code: ErrorCode, ctx: 'signIn' | 'signUp') {
  if (code === 'unauthorized' && ctx === 'signIn') return t('auth.generalError.unauthorized');
  if (code === 'conflict' && ctx === 'signUp') return t('auth.generalError.conflict');
  return t(`errors.${code}`);
}

export function SignInForm({ next }: { next?: string }) {
  const [navigating, router] = useNavigate();
  const target = safeNext(next);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []); // `data-ready`: typing before hydration is wiped by the controlled inputs (e2e waits for it)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errs, setErrs] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState<'password' | 'magic' | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.querySelector<HTMLInputElement>('input[type="email"]')?.focus();
  }, []);

  const focusField = (name: 'email' | 'password') => formRef.current?.querySelector<HTMLInputElement>(`[autocomplete="${name === 'email' ? 'email' : 'current-password'}"]`)?.focus();

  async function run(kind: 'password' | 'magic', action: () => Promise<AuthResult>, onOk: () => void | Promise<void>) {
    setBusy(kind);
    setError(null);
    const res = await action();
    if (res.ok) await onOk();
    else setError(generalMessage(res.error.code, 'signIn'));
    setBusy(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = { email: validEmail(email) ? undefined : t('auth.emailInvalid'), password: password ? undefined : t('auth.passwordRequired') };
    setErrs(next);
    if (next.email) return focusField('email');
    if (next.password) return focusField('password');
    void run('password', () => signIn({ email, password }), async () => {
      track('login', { method: 'password' });
      router.push(target);
      router.refresh();
    });
  }

  function magic() {
    if (!validEmail(email)) {
      setErrs({ email: t('auth.emailInvalid') });
      return focusField('email');
    }
    setErrs({});
    void run('magic', () => sendMagicLink({ email, next: target }), () => setSentTo(email));
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate data-ready={hydrated || undefined} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-text">{t('auth.signIn.title')}</h1>
        <p className="m-0 text-[15px] text-muted">{t('auth.signIn.subtitle')}</p>
      </div>
      <div className="flex flex-col gap-4">
        <Input label={t('auth.email')} type="email" autoComplete="email" inputMode="email" placeholder={t('auth.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errs.email} aria-describedby={errs.email ? 'si-email-err' : undefined} />
        <FieldError id="si-email-err">{errs.email}</FieldError>
        <PasswordField label={t('auth.password')} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errs.password} aria-describedby={errs.password ? 'si-pw-err' : undefined} />
        <FieldError id="si-pw-err">{errs.password}</FieldError>
        <Link href="/recuperar-senha" className="inline-flex min-h-11 items-center self-start text-sm font-bold text-primary-deep underline">{t('auth.forgot.link')}</Link>
      </div>
      {error ? <p role="alert" className="m-0 text-sm font-semibold text-review-text">{error}</p> : null}
      <Button type="submit" size="touch" loading={busy === 'password' || navigating} loadingLabel={t('common.loading')} disabled={busy === 'magic'}>{t('auth.signIn.submit')}</Button>
      <Button type="button" variant="secondary" size="touch" loading={busy === 'magic'} loadingLabel={t('common.loading')} disabled={busy === 'password'} onClick={magic}>
        {t('auth.magicLink')}
      </Button>
      {googleOn ? (
        <Button type="button" variant="secondary" size="touch" disabled={busy !== null} onClick={() => void run('magic', () => signInWithGoogle({ next: target }), () => undefined)}>
          {t('auth.google')}
        </Button>
      ) : null}
      <div aria-live="polite" role="status" className="text-sm">
        {sentTo ? (
          <>
            <p className="m-0 font-bold text-text">{t('auth.linkSent.title')}</p>
            <p className="m-0 text-muted">{t('auth.linkSent.body', { email: sentTo })}</p>
          </>
        ) : null}
      </div>
      <Separator />
      <p className="m-0 text-sm text-muted">
        {t('auth.signIn.noAccount')}{' '}
        {/* G14 (D-586): full prefetch (page + JS): /cadastro is dynamic with no loading.tsx, so the default prefetch fetched nothing. */}
        <Link href={target === APP_HOME ? '/cadastro' : `/cadastro?next=${encodeURIComponent(target)}`} prefetch className="inline-flex min-h-11 min-w-11 items-center justify-center font-bold text-primary-deep underline">
          {t('auth.signIn.toSignUp')}
        </Link>
      </p>
    </form>
  );
}
