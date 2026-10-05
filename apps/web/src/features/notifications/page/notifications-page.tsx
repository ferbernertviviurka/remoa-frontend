'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notificationCategories, type Notification, type NotificationCategory } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, CategoryChips, Icon, CompactSwitch, NotificationEmpty, NotificationGroups, SkeletonBlock, SkeletonRegion, useToast } from '@remoa/ui';
import { dismissNotification, listNotifications, markRead } from '../api';
import { useNotifications } from '../provider';
import { appLinkOf } from '../soft-nav';
import { notifTrack } from '../telemetry';
import { categoryLabel, formatMeta, groupViews } from '../view';
import { PrefsPanel } from './prefs-panel';

/** F26 FR-5 /app/notificacoes: chips, "Só não lidas", grouped list (20 per page) and the preferences panel. */
export function NotificationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { unread, timezone, version, changed } = useNotifications();
  const [category, setCategory] = useState<'all' | NotificationCategory>('all');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const seq = useRef(0);
  const query = { filter: onlyUnread ? ('unread' as const) : ('all' as const), ...(category === 'all' ? {} : { category }) };

  const load = useCallback(async () => {
    const n = ++seq.current;
    const r = await listNotifications({ filter: onlyUnread ? 'unread' : 'all', ...(category === 'all' ? {} : { category }) }).catch(() => null);
    if (n !== seq.current) return;
    if (r?.ok) {
      setItems(r.data.items);
      setNext(r.data.nextCursor);
      setState('ready');
    } else setState('error');
  }, [category, onlyUnread]);
  // reload on filter change and whenever Realtime / a local action bumps `version`
  useEffect(() => void load(), [load, version]);

  const more = async () => {
    if (!next) return;
    const r = await listNotifications({ ...query, cursor: next }).catch(() => null);
    if (!r?.ok) return setState('error');
    // dedupe by id: a Realtime refetch may already have brought some of these
    setItems((all) => [...all, ...r.data.items.filter((n) => !all.some((a) => a.id === n.id))]);
    setNext(r.data.nextCursor);
  };

  const read = (ids: string[]) => {
    setItems((all) => all.map((n) => (ids.includes(n.id) ? { ...n, readAt: n.readAt ?? new Date() } : n)));
    void markRead({ ids }).then(changed, changed);
  };
  const remove = async (id: string) => {
    setItems((all) => all.filter((n) => n.id !== id));
    notifTrack.removed();
    const r = await dismissNotification(id).catch(() => null);
    if (r?.ok) toast({ title: t('notifications.page.removed') });
    changed();
  };
  const typeOf = (id: string) => items.find((n) => n.id === id)?.type;

  // #preferencias from the bell's gear
  useEffect(() => {
    if (window.location.hash === '#preferencias') document.getElementById('preferencias')?.scrollIntoView();
  }, []);

  const chips = [{ id: 'all', label: t('notifications.category.all'), count: unread.total }, ...notificationCategories.map((c) => ({ id: c, label: categoryLabel(c), count: unread.byCategory[c] }))];

  return (
    <div
      className="mx-auto flex w-full max-w-[1304px] flex-col gap-6 md:px-6 md:py-2"
      onClick={(e) => {
        const href = appLinkOf(e.nativeEvent);
        if (!href || !(e.target as Element).closest('[data-notifications-list]')) return;
        e.preventDefault();
        router.push(href);
      }}
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-[.1em] text-muted">{t('notifications.page.eyebrow')}</span>
          <h1 className="m-0 font-display text-[44px] font-extrabold leading-none tracking-[-0.03em]">{t('notifications.page.title')}</h1>
        </div>
        {unread.total > 0 ? (
          <Button
            variant="secondary"
            size="touch"
            icon={<Icon name="check" size={18} />}
            onClick={() => {
              notifTrack.markedRead('all');
              setItems((all) => all.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
              void markRead({ all: true }).then(changed, changed);
            }}
          >
            {t('notifications.page.markAll')}
          </Button>
        ) : null}
      </header>
      <div className="grid items-start gap-7 min-[1100px]:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col gap-4">
          <CategoryChips label={t('notifications.page.categoryLabel')} items={chips} value={category} onChange={(id) => setCategory(id as 'all' | NotificationCategory)} />
          <CompactSwitch size="filter" label={t('notifications.page.onlyUnread')} checked={onlyUnread} onCheckedChange={setOnlyUnread} />
          <div data-notifications-list="" aria-label={t('notifications.page.listLabel')} role="region" className="overflow-hidden rounded-list border border-border bg-surface">
            {state === 'loading' ? (
              <SkeletonRegion label={t('notifications.page.loading')}>
                <div className="flex flex-col gap-3 p-5">{[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} height={72} radius={14} />)}</div>
              </SkeletonRegion>
            ) : state === 'error' ? (
              <div role="alert" className="flex flex-col items-start gap-3 p-6">
                <span>{t('notifications.page.loadError')}</span>
                <Button variant="secondary" size="sm" onClick={() => { setState('loading'); void load(); }}>{t('notifications.page.retry')}</Button>
              </div>
            ) : items.length === 0 ? (
              <NotificationEmpty size="page" text={t(onlyUnread || category !== 'all' ? 'notifications.page.noneUnread' : 'notifications.page.none')} />
            ) : (
              <NotificationGroups
                variant="page"
                groups={groupViews(items, timezone)}
                formatMeta={formatMeta}
                markReadLabel={t('notifications.item.markRead')}
                openLabel={t('notifications.item.open')}
                removeLabel={t('notifications.item.remove')}
                onOpen={(id) => {
                  const ty = typeOf(id);
                  if (ty) notifTrack.clicked(ty);
                  read([id]);
                }}
                onMarkRead={(id) => {
                  notifTrack.markedRead('one');
                  read([id]);
                }}
                onRemove={(id) => void remove(id)}
              />
            )}
            {state === 'ready' && next ? (
              <div className="flex justify-center border-t border-divider p-4"><Button variant="secondary" onClick={() => void more()}>{t('notifications.page.more')}</Button></div>
            ) : null}
          </div>
        </div>
        <PrefsPanel />
      </div>
    </div>
  );
}
