'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { isValidPassword } from '@remoa/contracts/constants';
import { t } from '@remoa/strings';
import { Button } from '@remoa/ui';
import { updatePassword } from '@/server/auth/actions';
import { useNavigate } from '@/features/shell/use-navigate';
import { FieldError, PasswordField } from './password-field';

/** Reached from the reset e-mail through /auth/callback (which has set the recovery session). Without a session the link is dead. */
export function ResetForm({ hasSession }: { hasSession: boolean }) {
  const [navigating, router] = useNavigate();
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!hasSession)
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="m-0 text-sm font-semibold text-review-text">{t('auth.reset.invalidLink')}</p>
        <Link href="/recuperar-senha" className="inline-flex min-h-11 items-center font-bold text-primary-deep underline">{t('auth.reset.newLink')}</Link>
      </div>
    );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidPassword(password)) return setErr(t('auth.passwordWeak'));
    setErr(null);
    setBusy(true);
    const res = await updatePassword({ password });
    setBusy(false);
    if (!res.ok) return setErr(t(`errors.${res.error.code}`));
    router.push('/app/hoje');
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-text">{t('auth.reset.title')}</h1>
        <p className="m-0 text-[15px] text-muted">{t('auth.reset.subtitle')}</p>
      </div>
      <PasswordField label={t('auth.password')} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!err} aria-describedby={err ? 'rs-err' : undefined} />
      <FieldError id="rs-err">{err}</FieldError>
      <Button type="submit" size="touch" loading={busy || navigating} loadingLabel={t('common.loading')}>{t('auth.reset.submit')}</Button>
    </form>
  );
}
