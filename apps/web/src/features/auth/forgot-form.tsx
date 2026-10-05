'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { t } from '@remoa/strings';
import { Button, Input } from '@remoa/ui';
import { requestPasswordReset } from '@/server/auth/actions';
import { validEmail } from './sign-in-form';
import { FieldError } from './password-field';

/** F24 FR-9: the same confirmation always, whether or not the account exists (no enumeration). */
export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validEmail(email)) return setErr(t('auth.emailInvalid'));
    setErr(null);
    setBusy(true);
    await requestPasswordReset({ email });
    setBusy(false);
    setSent(true);
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-text">{t('auth.forgot.title')}</h1>
        <p className="m-0 text-[15px] text-muted">{t('auth.forgot.subtitle')}</p>
      </div>
      <Input label={t('auth.email')} type="email" autoComplete="email" inputMode="email" placeholder={t('auth.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err} aria-describedby={err ? 'fg-err' : undefined} />
      <FieldError id="fg-err">{err}</FieldError>
      <Button type="submit" size="touch" loading={busy} loadingLabel={t('common.loading')}>{t('auth.forgot.submit')}</Button>
      <div aria-live="polite" role="status" className="text-sm">
        {sent ? (
          <>
            <p className="m-0 font-bold text-text">{t('auth.forgot.sentTitle')}</p>
            <p className="m-0 text-muted">{t('auth.forgot.sentBody')}</p>
          </>
        ) : null}
      </div>
      <Link href="/entrar" className="inline-flex min-h-11 items-center font-bold text-primary-deep underline">{t('auth.forgot.back')}</Link>
    </form>
  );
}
