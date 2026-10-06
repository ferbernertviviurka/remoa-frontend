'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { t } from '@remoa/strings';
import { Button, Input } from '@remoa/ui';
import { resendConfirmation } from '@/server/auth/actions';
import { FieldError } from './password-field';
import { generalMessage, validEmail } from './sign-in-form';

/** Screen after sign-up when the project requires e-mail confirmation, and the landing of a failed/expired confirmation link (`failed`). */
export function ConfirmEmail({ email: known, failed = false }: { email?: string; failed?: boolean }) {
  const [email, setEmail] = useState(known ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function resend(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!validEmail(email)) return setErr(t('auth.emailInvalid'));
    setErr(null);
    setSent(false);
    setBusy(true);
    const res = await resendConfirmation({ email });
    setBusy(false);
    if (res.ok) setSent(true);
    else setErr(generalMessage(res.error.code, 'signUp'));
  }

  return (
    <form onSubmit={(e) => void resend(e)} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-text">{t(failed ? 'auth.confirm.failedTitle' : 'auth.confirm.title')}</h1>
        <p className="m-0 text-[15px] text-muted">
          {failed ? t('auth.confirm.failedBody') : known ? t('auth.confirm.body', { email: known }) : t('auth.confirm.bodyNoEmail')}
        </p>
      </div>
      {!known ? (
        <>
          <Input label={t('auth.email')} type="email" autoComplete="email" inputMode="email" placeholder={t('auth.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err} aria-describedby={err ? 'ce-err' : undefined} />
          <FieldError id="ce-err">{err}</FieldError>
        </>
      ) : null}
      {known && err ? <p role="alert" className="m-0 text-sm font-semibold text-review-text">{err}</p> : null}
      <div aria-live="polite" role="status" className="text-sm">
        {sent ? <p className="m-0 font-bold text-text">{t('auth.confirm.resent')}</p> : null}
      </div>
      <Button type="submit" size="touch" variant={failed ? 'primary' : 'secondary'} loading={busy} loadingLabel={t('common.loading')}>{t('auth.confirm.resend')}</Button>
      <p className="m-0 text-sm text-muted">{t('auth.confirm.hint')}</p>
      <Link href="/entrar" className="inline-flex min-h-11 items-center font-bold text-primary-deep underline">{t('auth.confirm.toSignIn')}</Link>
    </form>
  );
}
