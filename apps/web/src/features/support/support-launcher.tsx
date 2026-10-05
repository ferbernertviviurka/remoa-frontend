'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { AccountSnapshot } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, Dialog, SupportFab, SupportModal, SupportSuccess } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { showNavbar } from '@/features/shell/navbar';
import { getSupportUnread, listMyTickets } from './api';
import { MyTickets } from './my-tickets';
import { onOpenSupport, type SupportFrom } from './open';
import { clearDraft } from './draft';
import { SupportForm } from './support-form';

const POLL_MS = 60_000; // SUPPORT_LIMITS.unreadPollSeconds (FR-8)
type Tab = 'new' | 'mine';

/** FR-1/FR-2: floating button (every (app) screen except the editor/desafio/novo mapa), modal, badge polling and `?suporte=<n>` deep link. */
export function SupportLauncher() {
  return (
    <Suspense fallback={null}>
      <Launcher />
    </Suspense>
  );
}

function Launcher() {
  const path = usePathname();
  const router = useRouter();
  const deepLink = useSearchParams().get('suporte');
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('new');
  const [openId, setOpenId] = useState<string | null>(null);
  const [sent, setSent] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [unread, setUnread] = useState(0);
  const [reload, setReload] = useState(0);
  const [account, setAccount] = useState<{ email: string; plan: string } | null>(null);

  const refreshUnread = useCallback(() => {
    getSupportUnread().then((r) => r.ok && setUnread(r.data.count)).catch(() => {});
  }, []);
  useEffect(() => {
    refreshUnread();
    const id = setInterval(refreshUnread, POLL_MS);
    return () => clearInterval(id);
  }, [refreshUnread]);

  const show = useCallback((from: SupportFrom, to: Tab = 'new') => {
    track('support_opened', { from });
    setTab(to); setOpen(true);
    api<AccountSnapshot>('/v1/account/me').then((r) => r.ok && setAccount({ email: r.data.email, plan: r.data.entitlements.plan })).catch(() => {});
  }, []);
  useEffect(() => onOpenSupport((from) => show(from)), [show]);

  // ?suporte=<number>: open on that conversation, then drop the param so a reload does not reopen it.
  useEffect(() => {
    if (!deepLink) return;
    show('email_link', 'mine');
    // E-mail links carry the ticket UUID; a plain number (#1042) is also accepted.
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deepLink)) setOpenId(deepLink);
    else void listMyTickets().then((r) => {
      const hit = r.ok ? r.data.find((k) => String(k.number) === deepLink) : null;
      if (hit) setOpenId(hit.id);
    });
    router.replace(path);
  }, [deepLink, path, router, show]);

  const close = () => {
    setOpen(false); setSent(null); setOpenId(null); setDirty(false); setConfirm(false);
    refreshUnread();
  };
  const requestClose = () => (dirty && sent === null ? setConfirm(true) : close());
  const onOpenChange = (o: boolean) => (o ? setOpen(true) : close());
  const label = unread > 0 ? `${t('support.floatingButton.ariaLabel')}, ${t(unread === 1 ? 'support.floatingButton.unreadCount' : 'support.floatingButton.unreadCountMany', { count: unread })}` : t('support.floatingButton.ariaLabel');
  const onDirtyChange = useCallback((d: boolean) => setDirty(d), []);

  return (
    <>
      {showNavbar(path) ? <SupportFab label={t('support.floatingButton.label')} aria-label={label} unread={unread} onClick={(e) => { e.currentTarget.focus(); show('fab'); }} /* Safari/Firefox do not focus buttons on click; the modal returns focus to the opener */ /> : null}
      <span role="status" className="sr-only">{unread > 0 && !open ? label : ''}</span>
      <SupportModal
        open={open}
        onOpenChange={onOpenChange}
        title={t('support.modal.title')}
        description={t('support.modal.description')}
        closeLabel={t('support.modal.close')}
        tabsLabel={t('support.modal.tabsLabel')}
        tabs={sent === null ? [{ value: 'new', label: t('support.modal.tabNewTicket') }, { value: 'mine', label: t('support.modal.tabMyTickets'), count: unread }] : undefined}
        activeTab={tab}
        onTabChange={(v) => setTab(v as Tab)}
        dirty={dirty && sent === null}
        onDirtyClose={() => setConfirm(true)}
      >
        {sent !== null ? (
          <SupportSuccess
            title={t('support.submission.success', { number: sent })}
            text={t('support.successScreen.subtitle')}
            actions={
              <>
                <Button onClick={() => { setSent(null); setTab('mine'); setReload((n) => n + 1); }}>{t('support.successScreen.viewTickets')}</Button>
                <Button variant="secondary" onClick={close}>{t('support.successScreen.close')}</Button>
              </>
            }
          />
        ) : (
          <>
            <div hidden={tab !== 'new'}>
              <SupportForm
                email={account?.email ?? ''}
                plan={account?.plan ?? 'free'}
                pathname={path}
                onDirtyChange={onDirtyChange}
                onSent={(n) => { setSent(n); setDirty(false); refreshUnread(); }}
                onSeeDuplicate={() => setTab('mine')}
                onCancel={requestClose}
              />
            </div>
            {tab === 'mine' ? <MyTickets openId={openId} onOpenIdChange={setOpenId} onUnreadChange={refreshUnread} reloadKey={reload} /> : null}
          </>
        )}
      </SupportModal>
      <Dialog open={confirm} onOpenChange={setConfirm} title={t('support.modal.unsavedTitle')} description={t('support.modal.unsavedWarning')} closeLabel={t('support.modal.close')}>
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={() => setConfirm(false)}>{t('support.modal.keepEditing')}</Button>
          <Button variant="danger" onClick={() => { clearDraft(); close(); }}>{t('support.modal.discard')}</Button>
        </div>
      </Dialog>
    </>
  );
}
