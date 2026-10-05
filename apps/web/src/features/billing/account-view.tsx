'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AccountExport, Entitlements, QuotaKey, RedirectUrl } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, Button, Card, Dialog, Pill, Progress, useToast } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { SignOutButton } from '@/features/auth/sign-out-button';
import { signOut } from '@/server/auth/actions';
import { formatDate } from './format';

const quotas: ReadonlyArray<{ key: QuotaKey; label: 'ai_grades' | 'ai_generations' | 'boards' | 'cards'; window: 'daily' | 'monthly' | 'total' }> = [
  { key: 'ai_grades', label: 'ai_grades', window: 'daily' },
  { key: 'ai_generations', label: 'ai_generations', window: 'monthly' },
  { key: 'boards', label: 'boards', window: 'total' },
  { key: 'cards', label: 'cards', window: 'total' },
];

export function AccountView({ email, ent, notice }: { email: string; ent: Entitlements; notice?: 'checkout' | 'portal' }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<'portal' | 'cancel' | 'export' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const announced = useRef(false);
  const founder = ent.plan === 'founder';
  const pro = ent.plan === 'pro';

  useEffect(() => {
    if (!notice || announced.current) return;
    announced.current = true;
    toast({ title: t(notice === 'checkout' ? 'billing.account.checkoutOk' : 'billing.account.portalOk') });
    router.replace('/app/conta'); // so a refresh doesn't announce (and track) it again
  }, [notice, router, toast]);

  async function portal(cancel: boolean) {
    setBusy(cancel ? 'cancel' : 'portal');
    setError(null);
    try {
      const r = await api<RedirectUrl>('/v1/billing/portal', { method: 'POST', body: JSON.stringify(cancel ? { cancel: true } : {}) });
      if (r.ok) {
        return void window.location.assign(r.data.url);
      }
    } catch {
      /* falls through to the message */
    }
    setError(t('billing.account.portalError'));
    setBusy(null);
  }

  async function exportData() {
    setBusy('export');
    setError(null);
    try {
      const r = await api<AccountExport>('/v1/account/export', { method: 'POST' });
      if (!r.ok) throw new Error(r.error.code);
      const url = URL.createObjectURL(new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `remoa-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      track('account_exported', {});
      toast({ title: t('billing.account.exportOk') });
    } catch {
      setError(t('billing.account.exportError'));
    }
    setBusy(null);
  }

  async function deleteAccount() {
    setBusy('delete');
    setError(null);
    try {
      const r = await api<{ hardDeleteAt: string }>('/v1/account', { method: 'DELETE' });
      if (r.ok) {
        track('account_deleted', {});
        await signOut();
        window.location.assign('/'); // full load: drops the cached session and the shell
        return;
      }
    } catch {
      /* falls through to the message */
    }
    setConfirm(false);
    setError(t('billing.account.deleteError'));
    setBusy(null);
  }

  const statusLabel = ent.status ? t(`billing.account.status.${ent.status}`) : null;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold text-text">{t('billing.account.title')}</h1>
        <p className="text-sm font-semibold text-text">{email}</p>
      </header>

      {error ? <Alert tone="review" role="alert" title={error} /> : null}

      <Card radius="review">
        <section aria-labelledby="plan-h" className="flex flex-col items-start gap-3">
          <h2 id="plan-h" className="text-xs font-bold uppercase tracking-[.13em] text-muted">{t('billing.account.planLabel')}</h2>
          <div className="flex items-center gap-2">
            <p className="font-display text-2xl font-extrabold text-text">{t(`billing.plan.${ent.plan}`)}</p>
            {pro && statusLabel ? <Pill tone={ent.status === 'past_due' ? 'review' : 'steady'}>{statusLabel}</Pill> : null}
          </div>
          {pro && ent.cancelAtPeriodEnd && ent.renewsAt ? <p className="text-sm">{t('billing.account.cancelsAt', { date: formatDate(ent.renewsAt) })}</p> : null}
          {pro && !ent.cancelAtPeriodEnd && ent.renewsAt ? <p className="text-sm">{t('billing.account.renewsAt', { date: formatDate(ent.renewsAt) })}</p> : null}
          {ent.graceUntil ? <Alert tone="watch" title={t('billing.account.grace', { date: formatDate(ent.graceUntil) })} /> : null}
          <div className="flex flex-wrap gap-2">
            {founder ? null : pro ? (
              <>
                <Button variant="secondary" loading={busy === 'portal'} onClick={() => void portal(false)}>{t('billing.account.manage')}</Button>
                {ent.cancelAtPeriodEnd ? null : (
                  <Button variant="quiet" loading={busy === 'cancel'} onClick={() => void portal(true)}>{t('billing.account.cancel')}</Button>
                )}
              </>
            ) : (
              <Button onClick={() => router.push('/app/planos?de=account_plan')}>{t('billing.account.subscribe')}</Button>
            )}
          </div>
        </section>
      </Card>

      <Card radius="review">
        <section aria-labelledby="usage-h" className="flex flex-col gap-4">
          <h2 id="usage-h" className="text-xs font-bold uppercase tracking-[.13em] text-muted">{t('billing.account.usageTitle')}</h2>
          {quotas.map(({ key, label, window }) => {
            const limit = ent.limits[key];
            const used = ent.usage[key];
            const name = `${t(`billing.pricing.${label}`)} (${t(`billing.account.${window}`)})`;
            const text = limit === 0 ? t('billing.account.usageNotIncluded') : limit === null ? t('billing.account.usageUnlimited', { used }) : t('billing.account.usageLine', { used, limit });
            return (
              <div key={key} className="flex flex-col gap-1">
                <div className="flex justify-between gap-2 text-sm">
                  <span>{name}</span>
                  <span className="font-semibold">{text}</span>
                </div>
                {limit === null || limit === 0 ? null : <Progress aria-label={name} value={used} max={Math.max(limit, 1)} />}
              </div>
            );
          })}
        </section>
      </Card>

      <Card radius="review">
        <section aria-labelledby="data-h" className="flex flex-col items-start gap-3">
          <h2 id="data-h" className="text-xs font-bold uppercase tracking-[.13em] text-muted">{t('billing.account.dataTitle')}</h2>
          <p className="text-sm text-muted">{t('billing.account.dataBody')}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" loading={busy === 'export'} onClick={() => void exportData()}>{t('billing.account.export')}</Button>
            <Button variant="danger" onClick={() => setConfirm(true)}>{t('billing.account.delete')}</Button>
          </div>
        </section>
      </Card>

      <div>
        <SignOutButton />
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm} title={t('billing.account.deleteTitle')} description={t('billing.account.deleteBody')} closeLabel={t('common.close')}>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button variant="danger" loading={busy === 'delete'} onClick={() => void deleteAccount()}>{t('billing.account.deleteConfirm')}</Button>
          <Button variant="quiet" onClick={() => setConfirm(false)}>{t('billing.account.deleteCancel')}</Button>
        </div>
      </Dialog>
    </div>
  );
}
