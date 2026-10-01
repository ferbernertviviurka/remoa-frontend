'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ErrorCode } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, Card, Input, Logo } from '@remoa/ui';
import { sendMagicLink, signIn, signInWithGoogle, signUp, type AuthResult } from '@/server/auth/actions';
import { identify, track } from '@/lib/analytics';
import { createClient } from '@/lib/supabase/client';
import { safeNext } from '@/lib/safe-next';

const googleOn = process.env.NEXT_PUBLIC_AUTH_GOOGLE === '1';

export function AuthForm({ mode, next }: { mode: 'signIn' | 'signUp'; next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ErrorCode | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const up = mode === 'signUp';
  const ns = up ? 'auth.signUp' : 'auth.signIn';
  const target = safeNext(next);

  async function run(action: () => Promise<AuthResult>, onOk: () => void | Promise<void>) {
    setBusy(true);
    setError(null);
    const res = await action();
    if (res.ok) await onOk();
    else setError(res.error.code);
    setBusy(false);
  }

  const done = async () => {
    track(up ? 'signup' : 'login', { method: 'password' });
    const { data } = await createClient().auth.getUser();
    if (data.user) identify(data.user.id);
    router.push(target);
    router.refresh();
  };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void run(() => (up ? signUp({ email, password }) : signIn({ email, password })), done);
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Logo size={32} />
          <h1 className="font-display text-2xl font-extrabold text-text">{t(`${ns}.title`)}</h1>
          <p className="text-sm text-muted">{t(`${ns}.subtitle`)}</p>
        </div>
        <Input label={t('auth.email')} type="email" autoComplete="email" required placeholder={t('auth.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label={t('auth.password')} type="password" autoComplete={up ? 'new-password' : 'current-password'} required minLength={up ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} />
        <div aria-live="polite" role="status" className="min-h-5 text-sm text-review-text">
          {error ? t(`errors.${error}`) : null}
        </div>
        <Button type="submit" size="touch" disabled={busy}>{t(`${ns}.submit`)}</Button>
        {up ? null : (
          <Button
            variant="secondary"
            size="touch"
            disabled={busy || !email}
            onClick={() => void run(() => sendMagicLink({ email, next: target }), () => setSentTo(email))}
          >
            {t('auth.magicLink')}
          </Button>
        )}
        {googleOn ? (
          <Button variant="secondary" size="touch" disabled={busy} onClick={() => void run(() => signInWithGoogle({ next: target }), () => undefined)}>
            {t('auth.google')}
          </Button>
        ) : null}
        <div aria-live="polite" role="status">
          {sentTo ? (
            <>
              <p className="text-sm font-bold text-text">{t('auth.linkSent.title')}</p>
              <p className="text-sm text-muted">{t('auth.linkSent.body', { email: sentTo })}</p>
            </>
          ) : null}
        </div>
        <p className="text-sm text-muted">
          {t(up ? 'auth.signUp.hasAccount' : 'auth.signIn.noAccount')}{' '}
          <Link href={up ? '/entrar' : '/cadastro'} className="font-bold text-primary-deep underline">
            {t(up ? 'auth.signUp.toSignIn' : 'auth.signIn.toSignUp')}
          </Link>
        </p>
      </form>
    </Card>
  );
}
