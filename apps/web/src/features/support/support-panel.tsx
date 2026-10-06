'use client';

import { t } from '@remoa/strings';
import { Button, Dialog, SupportModal, SupportSuccess } from '@remoa/ui';
import { MyTickets } from './my-tickets';
import { clearDraft } from './draft';
import { SupportForm } from './support-form';

export type Tab = 'new' | 'mine';

export type SupportPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sent: number | null;
  setSent: (n: number | null) => void;
  tab: Tab;
  setTab: (tab: Tab) => void;
  unread: number;
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
  confirm: boolean;
  setConfirm: (confirm: boolean) => void;
  account: { email: string; plan: string } | null;
  path: string;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  reload: number;
  setReload: (fn: (n: number) => number) => void;
  refreshUnread: () => void;
  close: () => void;
  requestClose: () => void;
};

/** P-507 (D-1071): the modal, form and tickets of the support launcher; loaded on the first open, out of every page's initial JS. */
export function SupportPanel({ open, onOpenChange, sent, setSent, tab, setTab, unread, dirty, setDirty, onDirtyChange, confirm, setConfirm, account, path, openId, setOpenId, reload, setReload, refreshUnread, close, requestClose }: SupportPanelProps) {
  return (
    <>
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
