'use client';

import { useMemo, useState } from 'react';
import { t } from '@remoa/strings';
import { Select, useToast } from '@remoa/ui';
import { api } from '@/lib/api';
import { useAccount } from '../shell/account-context';
import { Row } from '../shared/section-card';

const BRAZIL = ['Sao_Paulo', 'Manaus', 'Belem', 'Fortaleza', 'Recife', 'Bahia', 'Cuiaba', 'Porto_Velho', 'Boa_Vista', 'Rio_Branco', 'Noronha', 'Araguaina', 'Maceio', 'Santarem', 'Campo_Grande'].map((c) => `America/${c}`);

const zones = (current: string) => {
  let all: string[] = [];
  try {
    all = Intl.supportedValuesOf('timeZone');
  } catch {
    /* old engine: Brazil only */
  }
  return [...new Set([...BRAZIL, ...(all.includes(current) || BRAZIL.includes(current) ? [] : [current]), ...all])];
};

/** FR (CCR-037): editable IANA zone, Brazil first; the server replans pending calendar reminders in the same PATCH. */
export function TimezoneRow() {
  const { account, setAccount } = useAccount();
  const { toast } = useToast();
  const tz = account.profile.timezone;
  const options = useMemo(() => zones(tz).map((z) => ({ value: z, label: z.replace(/_/g, ' ') })), [tz]);
  const [replanned, setReplanned] = useState(false);

  async function change(next: string) {
    if (next === tz) return;
    setReplanned(false);
    setAccount((a) => ({ ...a, profile: { ...a.profile, timezone: next } }));
    const r = await api('/v1/account/profile', { method: 'PATCH', body: JSON.stringify({ timezone: next }) }).catch(() => null);
    if (r?.ok) return setReplanned(true);
    setAccount((a) => ({ ...a, profile: { ...a.profile, timezone: tz } }));
    toast({ title: t('account.genericError'), tone: 'danger' });
  }

  return (
    <Row label={t('account.profile.timezone')}>
      <div className="flex flex-col gap-2">
        <Select label={t('account.profile.timezone')} options={options} value={tz} onValueChange={(v) => void change(v)} />
        <span className="text-[13px] text-muted">{t('account.profile.dayStartsAt', { hour: '4h' })}</span>
        {replanned ? <p role="status" className="m-0 text-[13px] font-semibold text-muted">{t('account.profile.timezoneReplanned')}</p> : null}
      </div>
    </Row>
  );
}
