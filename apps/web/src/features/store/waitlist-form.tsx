'use client';

import { useState } from 'react';
import { t } from '@remoa/strings/store';
import { Alert, Button, FilterChip, Icon, Input, WaitlistSuccess } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { storeApi, type StoreInterest, type StoreSellerRole, type StoreWaitlistEntry } from './api';

const roles: StoreSellerRole[] = ['teacher', 'student_resident', 'physician'];
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

type Props = { accountEmail: string; entry: StoreWaitlistEntry | null; onSaved: (e: StoreWaitlistEntry) => void };

/** FR-8: e-mail da conta pré-preenchido, interesse, perfil se vender, validação, sucesso animado e "Alterar minhas respostas". */
export function WaitlistForm({ accountEmail, entry, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(entry?.email ?? accountEmail);
  const [interest, setInterest] = useState<StoreInterest[]>(entry?.interest ?? ['buy']);
  const [role, setRole] = useState<StoreSellerRole | ''>(entry?.sellerRole ?? '');
  const [error, setError] = useState<{ key: 'errEmail' | 'errInterest' | 'errRole' | 'errSave' | 'errRate' | 'errClosed'; field?: 'email' } | null>(null);
  const [busy, setBusy] = useState(false);
  const sell = interest.includes('sell');

  if (entry && !editing) {
    return <WaitlistSuccess title={t('store.waitlist.doneTitle')} text={t(entry.interest.includes('sell') ? 'store.waitlist.doneSell' : 'store.waitlist.doneBuy')} editLabel={t('store.waitlist.edit')} onEdit={() => setEditing(true)} />;
  }

  const toggle = (i: StoreInterest) => {
    setError(null);
    setInterest((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailOk(email)) return setError({ key: 'errEmail', field: 'email' });
    if (interest.length === 0) return setError({ key: 'errInterest' });
    if (sell && !role) return setError({ key: 'errRole' });
    setError(null);
    setBusy(true);
    try {
      const r = await storeApi.putWaitlist({ email: email.trim(), interest, sellerRole: sell && role ? role : null, consent: true });
      if (r.ok) {
        track('store_waitlist_joined', { interest: sell ? (interest.includes('buy') ? 'both' : 'sell') : 'buy', role: sell && role ? role : null });
        setEditing(false);
        onSaved(r.data);
      } else setError({ key: r.error.code === 'rate_limited' ? 'errRate' : r.error.code === 'conflict' ? 'errClosed' : r.error.code === 'validation' ? 'errInterest' : 'errSave' });
    } catch {
      setError({ key: 'errSave' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Input label={t('store.waitlist.email')} type="email" autoComplete="email" value={email} aria-invalid={error?.field === 'email' || undefined} onChange={(ev) => { setEmail(ev.target.value); setError(null); }} />
      <div className="flex flex-col gap-2">
        <span className="font-bold">{t('store.waitlist.interestLabel')}</span>
        <div role="group" aria-label={t('store.waitlist.interestGroup')} className="flex flex-wrap gap-2.5">
          <FilterChip pressed={interest.includes('buy')} onClick={() => toggle('buy')}>{t('store.waitlist.buy')}</FilterChip>
          <FilterChip pressed={sell} onClick={() => toggle('sell')}>{t('store.waitlist.sell')}</FilterChip>
        </div>
      </div>
      {sell ? (
        <div className="pop flex flex-col gap-2">
          <span className="font-bold">{t('store.waitlist.roleLabel')}</span>
          <div role="group" aria-label={t('store.waitlist.roleGroup')} className="flex flex-wrap gap-2.5">
            {roles.map((r) => <FilterChip key={r} pressed={role === r} onClick={() => { setRole(r); setError(null); }}>{t(`store.waitlist.roles.${r}`)}</FilterChip>)}
          </div>
          <span className="text-[13px] text-muted">{t('store.waitlist.roleHint')}</span>
        </div>
      ) : null}
      {error ? <Alert tone="review" role="alert" title={t(`store.waitlist.${error.key}`)} /> : null}
      <Button type="submit" size="lg" icon={<Icon name="mail" size={20} />} loading={busy} loadingLabel={t('store.waitlist.submitting')}>{t('store.waitlist.submit')}</Button>
      <span className="text-[13px] text-muted">{t('store.waitlist.consent')}</span>
    </form>
  );
}
