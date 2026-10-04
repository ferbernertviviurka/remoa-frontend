'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { emailSchema, goals, isValidName, normalizeName, stageSchema, ACCOUNT_LIMITS, type Goal, type Stage } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, Avatar, Button, ChoiceChip, Icon, InlineField, Input, Pill, useToast } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { useAccount } from '../shell/account-context';
import { initialsOf } from '../shell/format';
import { Row, SectionCard as Card } from '../shared/section-card';
import { useOnline } from '../shell/use-online';
import { usePhotoDialog } from './photo-dialog';

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

const go = (value: Goal, key: string) => ({ value, label: t(`account.profile.goalOptions.${key}` as 'account.profile.goalOptions.unknown') });
export const goalGroups = () =>
  [
    { label: t('account.profile.goalGroups.enamed'), options: [go('enamed_2027_1', 'enamed20271'), go('enamed_2027_2', 'enamed20272'), go('enamed_2028_1', 'enamed20281'), go('enamed_2028_2', 'enamed20282')] },
    { label: t('account.profile.goalGroups.residencia'), options: [go('residencia_enare', 'enare'), go('residencia_sus_sp', 'susSp'), go('residencia_usp', 'usp'), go('residencia_unifesp', 'unifesp'), go('residencia_outras', 'outrasResidencias')] },
    { label: t('account.profile.goalGroups.outros'), options: [go('provas_faculdade', 'provasFaculdade'), go('manter_atualizado', 'manterAtualizado'), go('undecided', 'unknown')] },
  ];
const st = (value: Stage, key: string) => ({ value, label: t(`account.profile.stageOptions.${key}` as 'account.profile.stageOptions.y34') });
// earliest to latest
export const stageOptions = () => [st('y1_2', 'y12'), st('y3_4', 'y34'), st('y5_6', 'y56'), st('graduated', 'graduate'), st('cursinho', 'cursinho'), st('resident', 'resident'), st('working', 'working')];

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
  const studyRef = useRef<HTMLDivElement>(null);
  const { profile } = account;
  const deleting = !!account.deletionScheduledFor;

  // Deep link from the hero chips: /conta/perfil?campo=nome|objetivo|email.
  useEffect(() => {
    if (!campo) return;
    if (campo === 'nome') setNameOpen(true);
    if (campo === 'objetivo') studyRef.current?.querySelector<HTMLElement>('[role="radio"]')?.focus();
    window.history.replaceState(null, '', '/app/conta/perfil');
  }, [campo]);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const fail = () => toast({ title: t('account.genericError'), tone: 'danger' });

  async function setStudy(key: 'goal' | 'stage', value: string) {
    const prev = profile[key];
    if (prev === value) return;
    setAccount((p) => ({ ...p, profile: { ...p.profile, [key]: value } }));
    try {
      const r = await patchProfile({ [key]: value });
      if (!r.ok) throw new Error(r.error.code);
      toast({ title: t('account.profile.studySaved') });
    } catch {
      setAccount((p) => ({ ...p, profile: { ...p.profile, [key]: prev } }));
      fail();
    }
  }

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
      <Card title={t('account.profile.studyTitle')} body={t('account.profile.studyBody')}>
        <div ref={studyRef} className="contents">
          <Row label={t('account.profile.goal')}>
            <div className="flex flex-col gap-3">
              {goalGroups().map((g) => (
                <div key={g.label} className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-muted">{g.label}</span>
                  <ChoiceChip label={`${t('account.profile.goal')}: ${g.label}`} options={g.options} value={g.options.some((o) => o.value === profile.goal) ? profile.goal : null} onValueChange={(v) => goals.includes(v as Goal) && void setStudy('goal', v)} />
                </div>
              ))}
            </div>
          </Row>
          <Row label={t('account.profile.stage')}>
            <ChoiceChip label={t('account.profile.stageLabel')} options={stageOptions()} value={profile.stage} onValueChange={(v) => stageSchema.safeParse(v).success && void setStudy('stage', v)} />
          </Row>
        </div>
        <Row label={t('account.profile.timezone')}>
          <span className="font-semibold">
            {profile.timezone === 'America/Sao_Paulo' ? t('account.profile.timezoneValue') : profile.timezone}{' '}
            <span className="font-normal text-muted">· {t('account.profile.dayStartsAt', { hour: '4h' })}</span>
          </span>
        </Row>
      </Card>
    </>
  );
}
