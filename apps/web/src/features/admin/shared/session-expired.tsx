'use client';

import { useState, type FormEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { t } from '@remoa/strings';
import { Button, Empty, Input } from '@remoa/ui';
import { reauthenticate } from '@/server/auth/actions';
import { signOutToLogin } from '@/features/auth/sign-out';
import { safeNext } from '@/lib/safe-next';

/**
 * FR-11 / D-588: the 12 h admin session is over. Password accounts confirm the password here and the page re-renders in place
 * (router.refresh repeats every request with the renewed token). Google / magic-link accounts have no password: they end the local
 * session (/entrar bounces signed-in users) and come back to this page.
 */
export function SessionExpired() {
  const path = safeNext(usePathname());
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError(null);
    const r = await reauthenticate(password);
    if (r.ok) router.refresh();
    else setError(t('admin.auth.wrongPassword'));
    setBusy(false);
  };
  const other = async () => {
    setBusy(true);
    if (!(await signOutToLogin(`/entrar?next=${encodeURIComponent(path)}`))) setBusy(false);
  };
  return (
    <div role="alert" className="p-10 max-lg:p-4">
      <Empty
        heading
        title={t('admin.auth.confirmTitle')}
        description={t('admin.auth.confirmDesc')}
        action={
          <form onSubmit={confirm} className="flex w-full max-w-[360px] flex-col gap-3 text-left">
            <Input label={t('admin.auth.password')} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} />
            {error ? <p role="alert" className="m-0 text-sm font-semibold text-review-text">{error}</p> : null}
            <Button type="submit" loading={busy} loadingLabel={t('common.loading')}>{t('admin.auth.confirm')}</Button>
            <Button type="button" variant="secondary" onClick={other} disabled={busy}>{t('admin.auth.otherMethod')}</Button>
          </form>
        }
      />
    </div>
  );
}
