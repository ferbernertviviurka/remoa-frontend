'use client';

import { useState, type FormEvent } from 'react';
import { t } from '@remoa/strings';
import { Button, useToast } from '@remoa/ui';
import { api } from '@/lib/api';
import { useAccount } from '../shell/account-context';
import { useOnline } from '../shell/use-online';
import { SectionCard } from '../shared/section-card';
import { PersonalFields, toPersonalValues, validatePersonal, type PersonalErrors, type PersonalValues } from './personal-fields';

/** G14 S1 (D-596): edit the sign-up personal data in the account. PII: never tracked or logged; clearing phone/address sends null (D-571). */
export function PersonalCard() {
  const { account, setAccount } = useAccount();
  const { toast } = useToast();
  const online = useOnline();
  const [value, setValue] = useState<PersonalValues>(() => toPersonalValues(account.profile));
  const [errors, setErrors] = useState<PersonalErrors>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const { errors: found, payload } = validatePersonal(value);
    setErrors(found);
    if (!payload) return;
    const body = { userType: payload.userType, ...(payload.sex ? { sex: payload.sex } : {}), phone: payload.phone ?? null, address: payload.address ?? null };
    setBusy(true);
    const r = await api('/v1/account/profile', { method: 'PATCH', body: JSON.stringify(body) }).catch(() => null);
    setBusy(false);
    if (!r?.ok) return toast({ title: t('account.genericError'), tone: 'danger' });
    setAccount((p) => ({ ...p, profile: { ...p.profile, userType: body.userType, sex: payload.sex ?? p.profile.sex, phone: body.phone, address: body.address } }));
    toast({ title: t('personal.saved') });
  }

  return (
    <SectionCard title={t('personal.title')} body={t('personal.body')}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5 pt-2">
        <PersonalFields value={value} onChange={setValue} errors={errors} idPrefix="pc" />
        <div>
          <Button type="submit" loading={busy} disabled={!online}>{t('common.save')}</Button>
        </div>
      </form>
    </SectionCard>
  );
}
