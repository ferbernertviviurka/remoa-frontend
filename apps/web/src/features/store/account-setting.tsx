'use client';

import { useEffect, useState } from 'react';
import { t } from '@remoa/strings';
import { Alert, Button, useToast } from '@remoa/ui';
import { SectionCard } from '../account/shared/section-card';
import { storeApi, type StoreWaitlistEntry } from './api';

/** F20 FR-9: sair da lista de espera da loja em Minha conta. Só aparece para quem está na lista. */
export function StoreWaitlistSetting() {
  const { toast } = useToast();
  const [entry, setEntry] = useState<StoreWaitlistEntry | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    void storeApi.getWaitlist().then((r) => { if (r.ok) setEntry(r.data); });
  }, []);
  if (!entry) return null;
  async function leave() {
    setError(false);
    const r = await storeApi.leaveWaitlist().catch(() => null);
    if (r?.ok) { setEntry(null); toast({ title: t('store.account.left') }); } else setError(true);
  }
  return (
    <SectionCard title={t('store.account.title')} body={t('store.account.body')} action={<Button variant="secondary" onClick={() => void leave()}>{t('store.account.leave')}</Button>}>
      {error ? <Alert tone="review" role="alert" title={t('store.account.error')} /> : null}
    </SectionCard>
  );
}
