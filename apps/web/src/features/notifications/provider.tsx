'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { notificationCategories, notificationTypeSchema, type NotificationCategory, type UnreadCount } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { getUnreadCount } from './api';
import { textOf, type Textable } from './view';

const ZERO: UnreadCount = { total: 0, byCategory: Object.fromEntries(notificationCategories.map((c) => [c, 0])) as Record<NotificationCategory, number> };
export const POLL_MS = 60_000;

type Ctx = {
  unread: UnreadCount;
  timezone: string;
  /** bumps whenever something changed (own action or Realtime): lists refetch by id, so nothing is duplicated */
  version: number;
  /** text for the polite aria-live region ("Nova notificação: …") */
  announcement: string;
  /** call after any local mutation (read, remove) */
  changed: () => void;
};
const Context = createContext<Ctx>({ unread: ZERO, timezone: 'America/Sao_Paulo', version: 0, announcement: '', changed: () => undefined });
export const useNotifications = () => useContext(Context);

/** Realtime payload row (snake_case Postgres row): only what the web needs to word the announcement. */
const announce = (row: Record<string, unknown>, tz: string) => {
  const type = notificationTypeSchema.safeParse(row.type);
  if (!type.success || !row.data) return '';
  try {
    return t('notifications.live', { title: textOf({ type: type.data, data: row.data } as Textable, tz).title });
  } catch {
    return '';
  }
};

export function NotificationsProvider({ timezone = 'America/Sao_Paulo', children }: { timezone?: string; children: ReactNode }) {
  const [unread, setUnread] = useState<UnreadCount>(ZERO);
  const [version, setVersion] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    const r = await getUnreadCount().catch(() => null);
    if (alive.current && r?.ok) setUnread(r.data);
  }, []);
  const changed = useCallback(() => {
    setVersion((v) => v + 1);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    alive.current = true;
    void refresh();
    // Fallback without a Realtime connection: poll every 60 s while the tab is visible (FR-9).
    const id = setInterval(() => document.visibilityState === 'visible' && void refresh(), POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onVisible);

    let cleanup = () => {};
    void (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user || !alive.current) return;
        const channel = supabase
          .channel(`notifications:${data.user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${data.user.id}` }, (p) => {
            if (p.eventType === 'INSERT') setAnnouncement(announce(p.new, timezone));
            changed();
          })
          .subscribe();
        cleanup = () => void supabase.removeChannel(channel);
      } catch {
        /* no Realtime: the poll above keeps the badge fresh */
      }
    })();
    return () => {
      alive.current = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      cleanup();
    };
  }, [refresh, changed, timezone]);

  const value = useMemo(() => ({ unread, timezone, version, announcement, changed }), [unread, timezone, version, announcement, changed]);
  return (
    <Context.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="sr-only">{announcement}</div>
    </Context.Provider>
  );
}
