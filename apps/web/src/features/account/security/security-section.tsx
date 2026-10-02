'use client';

import { useCallback, useEffect, useState } from 'react';
import { isValidPassword, passwordStrength, type LinkedIdentity, type SessionInfo } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, Button, Icon, Input, PasswordMeter, SkeletonBlock, SkeletonRegion, useToast } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { SectionCard } from '../shared/section-card';
import { useAccount } from '../shell/account-context';
import { useOnline } from '../shared/use-online';

const googleOn = process.env.NEXT_PUBLIC_AUTH_GOOGLE === '1';
const iconBox = 'flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-chip text-[#3A3558]';
const pill = 'rounded-pill bg-primary-tint px-3 py-1 text-[13px] font-bold text-primary-deep';
const itemRow = 'grid min-h-[76px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-4 border-t border-divider';

/** Swallows network failures (api() throws offline) into the same shape as an HTTP error. */
async function call<T>(path: string, init?: RequestInit) {
  try {
    return await api<T>(path, init);
  } catch {
    return { ok: false as const, error: { code: 'internal' as const, message: 'network' } };
  }
}

function relative(iso: string | Date): string {
  const secs = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  if (Math.abs(secs) < 60) return t('account.security.justNow');
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [['day', 86400], ['hour', 3600], ['minute', 60]];
  const [unit, size] = steps.find(([, s]) => Math.abs(secs) >= s)!;
  return rtf.format(Math.round(secs / size), unit);
}

export function SecuritySection() {
  const [reload, setReload] = useState(0);
  return (
    <div className="flex flex-col gap-6">
      <PasswordCard onChanged={() => setReload((n) => n + 1)} />
      <LoginCard />
      <DevicesCard reload={reload} />
    </div>
  );
}

function PasswordCard({ onChanged }: { onChanged: () => void }) {
  const { account, setAccount } = useAccount();
  const { toast } = useToast();
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = passwordStrength(next);
  const match = confirm.length > 0 && confirm === next;
  const can = online && !busy && current.length > 0 && isValidPassword(next) && match;
  const type = shown ? 'text' : 'password';

  function reset(v: boolean) {
    setOpen(v);
    setCurrent('');
    setNext('');
    setConfirm('');
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const r = await call<{ revokedSessions: number }>('/v1/account/password', { method: 'POST', body: JSON.stringify({ currentPassword: current, newPassword: next }) });
    setBusy(false);
    if (r.ok) {
      track('password_changed', { strength: strength.label });
      setAccount((p) => ({ ...p, passwordChangedAt: new Date() }));
      toast({ title: t('account.security.saved') });
      reset(false);
      onChanged();
      return;
    }
    setError(
      r.error.code === 'rate_limited'
        ? t('account.security.rateLimitedGeneric')
        : r.error.code === 'validation' || r.error.code === 'unauthorized'
          ? t('account.security.wrongCurrent')
          : t('account.security.passwordError'),
    );
  }

  const changedAt = account.passwordChangedAt;
  return (
    <SectionCard
      title={t('account.security.passwordTitle')}
      body={changedAt ? t('account.security.passwordChanged', { when: relative(changedAt) }) : undefined}
      action={
        <Button type="button" variant="secondary" size="sm" aria-expanded={open} aria-controls="sec-pw-form" onClick={() => reset(!open)}>
          {open ? t('account.security.passwordCancel') : t('account.security.passwordChange')}
        </Button>
      }
    >
      {open ? (
        <form
          id="sec-pw-form"
          aria-label={t('account.security.passwordTitle')}
          className="slide mt-3.5 flex max-w-[520px] flex-col gap-4 border-t border-divider pt-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (can) void save();
          }}
        >
          <Input label={t('account.security.current')} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />
          <div className="flex flex-col gap-2">
            <span className="relative block">
              <Input label={t('account.security.next')} type={type} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
              <button
                type="button"
                aria-label={t('account.security.show')}
                aria-pressed={shown}
                onClick={() => setShown((v) => !v)}
                className="absolute bottom-1 right-1 flex size-11 items-center justify-center rounded-xl text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Icon name={shown ? 'eyeOff' : 'eye'} size={20} />
              </button>
            </span>
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
          <div className="flex flex-col gap-2">
            <Input label={t('account.security.confirm')} type={type} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {confirm ? <p role="status" className={`m-0 text-[13px] font-semibold ${match ? 'text-primary-deep' : 'text-review-text'}`}>{t(match ? 'account.security.match' : 'account.security.noMatch')}</p> : null}
          </div>
          {error ? <Alert tone="review" role="alert" title={error} /> : null}
          {online ? null : <Alert tone="watch" title={t('account.offline')} />}
          <span className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="hero" disabled={!can} loading={busy}>{t('account.security.save')}</Button>
            <span className="text-[13px] text-muted">{t('account.security.saveNote')}</span>
          </span>
        </form>
      ) : null}
    </SectionCard>
  );
}

function LoginCard() {
  const { account, setAccount } = useAccount();
  const { toast } = useToast();
  const online = useOnline();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const google = account.identities.find((i) => i.provider === 'google');
  const hasEmail = account.identities.some((i) => i.provider === 'email');

  async function disconnect() {
    setBusy(true);
    setError(null);
    const r = await call<LinkedIdentity[]>('/v1/account/identities/google', { method: 'DELETE' });
    setBusy(false);
    if (r.ok) {
      track('identity_unlinked', { provider: 'google' });
      setAccount((p) => ({ ...p, identities: r.data }));
      toast({ title: t('account.security.googleDisconnectedOk') });
    } else setError(r.error.code === 'conflict' ? t('account.security.lastMethod') : t('account.security.googleError'));
  }

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await createClient().auth.linkIdentity({ provider: 'google', options: { redirectTo: `${window.location.origin}/conta/seguranca` } });
      if (e) throw e;
      // the browser redirects to Google; identity_linked fires from the shell when the snapshot shows it
    } catch {
      setError(t('account.security.googleError'));
      setBusy(false);
    }
  }

  return (
    <SectionCard title={t('account.security.loginTitle')} body={t('account.security.loginBody')}>
      <ul className="m-0 flex list-none flex-col p-0">
        {hasEmail ? (
          <li className={itemRow}>
            <span className={`${iconBox} !bg-primary-tint !text-primary-deep`}><Icon name="mail" size={22} /></span>
            <span className="flex flex-col leading-[1.35]">
              <span className="font-bold text-ink">{t('account.security.emailPassword')}</span>
              <span className="text-sm text-muted">{account.email}</span>
            </span>
            <span className={pill}>{t('account.security.active')}</span>
          </li>
        ) : null}
        {googleOn || google ? (
          <li className={itemRow}>
            <span className={`${iconBox} font-display text-[20px] font-extrabold`} aria-hidden="true">{t('account.security.googleLetter')}</span>
            <span className="flex flex-col leading-[1.35]">
              <span className="font-bold text-ink">{t('account.security.google')}</span>
              <span className="text-sm text-muted">{google ? t('account.security.googleConnected', { email: google.email ?? '' }) : t('account.security.googleOff')}</span>
            </span>
            <Button variant="secondary" size="sm" loading={busy} disabled={!online || (!google && !googleOn)} onClick={() => void (google ? disconnect() : connect())}>
              {google ? t('account.security.googleDisconnect') : t('account.security.googleConnect')}
            </Button>
          </li>
        ) : null}
      </ul>
      {error ? <Alert tone="review" role="alert" title={error} /> : null}
    </SectionCard>
  );
}

function DevicesCard({ reload }: { reload: number }) {
  const { toast } = useToast();
  const online = useOnline();
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    const r = await call<SessionInfo[]>('/v1/account/sessions');
    if (r.ok) setSessions(r.data);
    else setFailed(true);
  }, []);
  useEffect(() => {
    void load();
  }, [load, reload]);

  const name = (s: SessionInfo) => (s.browser && s.os ? t('account.security.deviceName', { browser: s.browser, os: s.os }) : (s.browser ?? s.os ?? t('account.security.unknownDevice')));

  /** Fades the row(s) out, then drops them from the list. */
  function drop(ids: string[]) {
    setLeaving(new Set(ids));
    setTimeout(() => {
      setSessions((p) => p && p.filter((s) => !ids.includes(s.id)));
      setLeaving(new Set());
    }, 200);
  }

  async function end(s: SessionInfo) {
    setBusy(s.id);
    setError(null);
    const r = await call<null>(`/v1/account/sessions/${s.id}`, { method: 'DELETE' });
    setBusy(null);
    if (r.ok) {
      track('session_revoked', { count: 1 });
      toast({ title: t('account.security.ended', { name: name(s) }) });
      drop([s.id]);
    } else setError(t('account.security.endError'));
  }

  async function endOthers() {
    setBusy('others');
    setError(null);
    const r = await call<{ count: number }>('/v1/account/sessions', { method: 'DELETE' });
    setBusy(null);
    if (r.ok) {
      track('session_revoked', { count: r.data.count });
      toast({ title: t('account.security.endedOthers') });
      drop((sessions ?? []).filter((s) => !s.current).map((s) => s.id));
    } else setError(t('account.security.endError'));
  }

  const others = (sessions ?? []).filter((s) => !s.current).length;
  const phone = (s: SessionInfo) => /iOS|Android/i.test(s.os ?? '');
  return (
    <SectionCard
      title={t('account.security.devicesTitle')}
      body={t('account.security.devicesBody')}
      action={
        others > 0 ? (
          <Button variant="secondary" size="sm" loading={busy === 'others'} disabled={!online || busy !== null} onClick={() => void endOthers()}>
            {t('account.security.endOthers')}
          </Button>
        ) : undefined
      }
    >
      {error ? <Alert tone="review" role="alert" title={error} /> : null}
      {failed ? (
        <Alert tone="review" role="alert" title={t('account.security.devicesError')}>
          <Button variant="secondary" size="sm" onClick={() => void load()}>{t('account.retry')}</Button>
        </Alert>
      ) : sessions === null ? (
        <SkeletonRegion label={t('account.skeletonLabel')}>
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => <SkeletonBlock key={i} height={64} radius={16} />)}
          </div>
        </SkeletonRegion>
      ) : (
        <ul aria-label={t('account.security.devicesLabel')} className="m-0 mt-1.5 flex list-none flex-col p-0">
          {sessions.map((s) => (
            <li key={s.id} className={`${itemRow} transition-all duration-200 ${leaving.has(s.id) ? 'translate-x-2 opacity-0' : ''}`}>
              <span className={iconBox}><Icon name={phone(s) ? 'phone' : 'monitor'} size={22} /></span>
              <span className="flex flex-col leading-[1.35]">
                <span className="font-bold text-ink">{name(s)}</span>
                <span className="text-sm text-muted">{s.current ? t('account.security.thisDeviceNow') : t('account.security.lastSeen', { when: relative(s.lastActiveAt) })}</span>
              </span>
              {s.current ? (
                <span className={pill}>{t('account.security.thisDevice')}</span>
              ) : (
                <Button variant="secondary" size="sm" aria-label={t('account.security.endLabel', { name: name(s) })} loading={busy === s.id} disabled={!online || busy !== null} onClick={() => void end(s)}>
                  {t('account.security.end')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {online ? null : <Alert tone="watch" title={t('account.offline')} />}
    </SectionCard>
  );
}
