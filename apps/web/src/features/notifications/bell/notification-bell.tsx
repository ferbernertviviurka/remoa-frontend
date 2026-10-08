'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Notification, NotificationType } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { BellButton, NotificationPopover, type NotificationTab } from '@remoa/ui';
import { useNavigate } from '@/features/shell/use-navigate';
import { listNotifications, markRead } from '../api';
import { useNotifications } from '../provider';
import { appLinkOf } from '../soft-nav';
import { notifTrack } from '../telemetry';
import { formatMeta, groupViews } from '../view';

/** F26 FR-1/FR-2: the bell of every shell screen and its popover. */
export function NotificationBell() {
  const [, nav] = useNavigate();
  const { unread, timezone, version, changed } = useNotifications();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<NotificationTab>('all');
  const [items, setItems] = useState<Notification[]>([]);
  const [state, setState] = useState<'ready' | 'loading' | 'error'>('loading');
  const seq = useRef(0);

  const load = useCallback(async () => {
    const n = ++seq.current;
    const r = await listNotifications({ filter: tab }).catch(() => null);
    if (n !== seq.current) return;
    if (r?.ok) {
      setItems(r.data.items);
      setState('ready');
    } else setState('error');
  }, [tab]);

  // fetch on open, on tab change and whenever Realtime / a local action bumps `version` (refetch by id: no duplicates)
  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load, version]);

  const typeOf = useRef(new Map<string, NotificationType>());
  typeOf.current = new Map(items.map((n) => [n.id, n.type]));

  const read = (ids: string[]) => {
    setItems((all) => all.map((n) => (ids.includes(n.id) ? { ...n, readAt: n.readAt ?? new Date() } : n)));
    void markRead({ ids }).then(changed, changed);
  };

  // clicks on links inside the popover: close and navigate client-side (also from the gear and "Ver todas").
  // Capture runs before the popover dismisses the click; the push stays in a transition so closing the panel does not drop it.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const dialog = (e.target as Element | null)?.closest('[role="dialog"]');
      const href = dialog ? appLinkOf(e, dialog) : null;
      if (!href) return;
      e.preventDefault();
      setOpen(false);
      nav.push(href);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [open, nav]);

  return (
    <NotificationPopover
      trigger={<BellButton count={unread.total} label={unread.total > 0 ? t('notifications.bell.unread', { n: unread.total }) : t('notifications.bell.none')} />}
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setState('loading');
          notifTrack.bellOpened(unread.total);
        }
        setOpen(o);
      }}
      dialogLabel={t('notifications.popover.label')}
      title={t('notifications.popover.title')}
      markAllLabel={t('notifications.popover.markAll')}
      onMarkAll={() => {
        notifTrack.markedRead('all');
        setItems((all) => all.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
        void markRead({ all: true }).then(changed, changed);
      }}
      settingsLabel={t('notifications.popover.settings')}
      settingsHref="/app/notificacoes#preferencias"
      tabsLabel={t('notifications.popover.tabsLabel')}
      tabAllLabel={t('notifications.popover.tabAll')}
      tabUnreadLabel={t('notifications.popover.tabUnread')}
      tab={tab}
      onTabChange={(x) => {
        setState('loading');
        setTab(x);
      }}
      unreadCount={unread.total}
      seeAllLabel={t('notifications.popover.seeAll')}
      seeAllHref="/app/notificacoes"
      emptyLabel={t('notifications.popover.empty')}
      allReadLabel={t('notifications.popover.allRead')}
      state={state}
      loadingLabel={t('notifications.popover.loading')}
      error={{ message: t('notifications.popover.error'), retryLabel: t('notifications.popover.retry'), onRetry: () => { setState('loading'); void load(); } }}
      groups={groupViews(items, timezone)}
      formatMeta={formatMeta}
      markReadLabel={t('notifications.item.markRead')}
      onOpen={(id) => {
        const ty = typeOf.current.get(id);
        if (ty) notifTrack.clicked(ty);
        read([id]);
      }}
      onMarkRead={(id) => {
        notifTrack.markedRead('one');
        read([id]);
      }}
    />
  );
}
