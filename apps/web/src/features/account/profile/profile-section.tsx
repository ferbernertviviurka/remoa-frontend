'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { emailSchema, isValidName, normalizeName, ACCOUNT_LIMITS } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Alert, Avatar, Button, Icon, InlineField, Input, Pill, useToast } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { useAccount } from '../shell/account-context';
import { initialsOf } from '../shell/format';
import { SectionCard as Card } from '../shared/section-card';
import { useOnline } from '../shell/use-online';
import { usePhotoDialog } from './photo-dialog';
import { PersonalCard } from './personal-card';
import { StudySection } from './study-section';

const t = withStrings({ account: more.account, onboarding: more.onboarding, personal: more.personal });

const patchProfile = (body: object) => api('/v1/account/profile', { method: 'PATCH', body: JSON.stringify(body) });

function NameForm({ close }: { close: () => void }) {
  const { account, setAccount } = useAccount();
  const { toast } = useToast();
  const online = useOnline();
  const [draft, setDraft] = useState(account.profile.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const valid = isValidName(draft);
  const same = normalizeName(draft) === normalizeName(account.profile.name ?? '');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || same || busy) return;
    setBusy(true);
    setError(null);
    const name = normalizeName(draft);
    try {
      const r = await patchProfile({ name });
      if (!r.ok) throw new Error(r.error.code);
      setAccount((p) => ({ ...p, profile: { ...p.profile, name } }));
      track('profile_name_changed', {});
      toast({ title: t('account.profile.nameSaved') });
      close();
    } catch {
      setError(t('account.genericError')); // field stays open (FR-6)
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Input label={t('account.profile.name')} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus autoComplete="name" aria-invalid={draft !== '' && !valid} />
      <span className="text-[13px] text-muted">{t('account.profile.nameHelp')}</span>
      {draft !== '' && !valid ? <p role="alert" className="m-0 text-sm font-semibold text-review-text">{t('account.profile.nameInvalid')}</p> : null}
      {error ? <p role="alert" className="m-0 text-sm font-semibold text-review-text">{error}</p> : null}
      <span className="flex gap-2.5">
        <Button type="submit" disabled={!valid || same || busy || !online}>
          {t('account.profile.nameSave')}
        </Button>
        <Button type="button" variant="secondary" onClick={close}>
          {t('common.cancel')}
        </Button>
      </span>
    </form>
  );
}

function EmailForm({ close, onSent }: { close: () => void; onSent: () => void }) {
  const { account, setAccount } = useAccount();
  const { toast } = useToast();
  const online = useOnline();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Google-only users reauthenticate with Google, so there is no password to ask for.
  const needsPassword = account.identities.length === 0 || account.identities.some((i) => i.provider === 'email');
  const parsed = emailSchema.safeParse(email);
  const valid = parsed.success && parsed.data !== account.email.toLowerCase() && (!needsPassword || password !== '');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || busy || !parsed.success) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ pendingEmail: string }>('/v1/account/email', {
        method: 'POST',
        body: JSON.stringify({ newEmail: parsed.data, ...(needsPassword ? { currentPassword: password } : {}) }),
      });
      if (!r.ok) throw new Error(r.error.code);
      setAccount((p) => ({ ...p, pendingEmail: r.data.pendingEmail }));
      track('email_change_requested', {});
      toast({ title: t('account.profile.emailSent', { email: r.data.pendingEmail }) });
      onSent();
      close();
    } catch {
      setError(t('account.profile.emailError')); // generic: never reveals whether the address is taken
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Input label={t('account.profile.emailNew')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus autoComplete="email" />
      {email !== '' && !valid && !(needsPassword && password === '' && parsed.success) ? <p role="alert" className="m-0 text-sm font-semibold text-review-text">{t('account.profile.emailInvalid')}</p> : null}
      {needsPassword ? <Input label={t('account.security.current')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /> : null}
      <span className="text-[13px] text-muted">{t('account.profile.emailHelp')}</span>
      {error ? <p role="alert" className="m-0 text-sm font-semibold text-review-text">{error}</p> : null}
      <span className="flex gap-2.5">
        <Button type="submit" disabled={!valid || busy || !online}>
          {t('account.profile.emailSend')}
        </Button>
        <Button type="button" variant="secondary" onClick={close}>
          {t('common.cancel')}
        </Button>
      </span>
    </form>
  );
}

export function ProfileSection() {
  const { account, setAccount } = useAccount();
  const { toast } = useToast();
  const online = useOnline();
  const photo = usePhotoDialog();
  const params = useSearchParams();
  const campo = params.get('campo');
  const [nameOpen, setNameOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [wait, setWait] = useState(0);
  const { profile } = account;
  const deleting = !!account.deletionScheduledFor;

  // Deep link from the hero chips: /conta/perfil?campo=nome|email|estudo (StudySection opens its editor; `objetivo` = old links).
  useEffect(() => {
    if (!campo) return;
    if (campo === 'nome') setNameOpen(true);
    window.history.replaceState(null, '', '/app/conta/perfil');
  }, [campo]);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const fail = () => toast({ title: t('account.genericError'), tone: 'danger' });

  async function resend() {
    try {
      const r = await api('/v1/account/email/resend', { method: 'POST' });
      if (!r.ok && r.error.code === 'rate_limited') {
        setWait(ACCOUNT_LIMITS.emailResendSeconds);
        return toast({ title: t('account.profile.emailResendWait', { s: ACCOUNT_LIMITS.emailResendSeconds }) });
      }
      if (!r.ok) throw new Error(r.error.code);
      setWait(ACCOUNT_LIMITS.emailResendSeconds);
      toast({ title: t('account.profile.emailResent', { email: account.pendingEmail ?? '' }) });
    } catch {
      fail();
    }
  }

  async function cancelPending() {
    const prev = account.pendingEmail;
    setAccount((p) => ({ ...p, pendingEmail: null }));
    try {
      const r = await api('/v1/account/email', { method: 'DELETE' });
      if (!r.ok) throw new Error(r.error.code);
      toast({ title: t('account.profile.emailCanceled') });
    } catch {
      setAccount((p) => ({ ...p, pendingEmail: prev }));
      fail();
    }
  }

  const name = profile.name?.trim() || null;
  return (
    <>
      <Card title={t('account.profile.personalTitle')} body={t('account.profile.personalBody')}>
        <InlineField
          label={t('account.profile.photo')}
          editLabel={t('account.profile.photoChange')}
          editIcon={<Icon name="camera" size={18} />}
          onEdit={photo.open}
          value={
            <span className="flex min-w-0 items-center gap-3.5">
              <Avatar name={name ?? t('account.hero.noName')} fallback={initialsOf(name, account.email)} src={account.avatarUrls?.small} size={48} color={profile.avatarColor} plain />
              <span className="text-sm font-normal text-muted">{t('account.profile.photoHelp')}</span>
            </span>
          }
        />
        <InlineField
          label={t('account.profile.name')}
          value={name ?? t('account.hero.noName')}
          editLabel={t('account.profile.nameEdit')}
          editIcon={<Icon name="pencil" size={18} />}
          editAriaLabel={`${t('account.profile.nameEdit')} ${t('account.profile.name').toLowerCase()}`}
          open={nameOpen}
          onOpenChange={setNameOpen}
        >
          {({ close }) => <NameForm close={close} />}
        </InlineField>
        <InlineField
          label={t('account.profile.email')}
          editLabel={t('account.profile.emailChange')}
          editIcon={<Icon name="mail" size={18} />}
          editAriaLabel={`${t('account.profile.emailChange')} ${t('account.profile.email').toLowerCase()}`}
          onEdit={deleting ? () => toast({ title: t('account.profile.emailBlockedByDeletion') }) : undefined}
          open={emailOpen}
          onOpenChange={setEmailOpen}
          value={
            <span className="flex flex-wrap items-center gap-2.5">
              {account.email}
              {account.emailConfirmed ? <Pill tone="steady">{t('account.profile.emailConfirmed')}</Pill> : null}
            </span>
          }
          status={
            account.pendingEmail ? (
              <Alert tone="watch" title={t('account.profile.emailPending', { email: account.pendingEmail })}>
                <span className="flex flex-wrap items-center gap-2">
                  <Button variant="quiet" size="sm" disabled={wait > 0 || !online} onClick={resend}>
                    {t('account.profile.emailResend')}
                  </Button>
                  <Button variant="quiet" size="sm" disabled={!online} onClick={cancelPending}>
                    {t('account.profile.emailCancel')}
                  </Button>
                  {wait > 0 ? <span className="text-xs font-normal">{t('account.profile.emailResendWait', { s: wait })}</span> : null}
                </span>
              </Alert>
            ) : null
          }
        >
          {({ close }) => <EmailForm close={close} onSent={() => setWait(ACCOUNT_LIMITS.emailResendSeconds)} />}
        </InlineField>
      </Card>
      <StudySection openEditor={campo === 'estudo' || campo === 'objetivo'} />
      <PersonalCard />
    </>
  );
}
