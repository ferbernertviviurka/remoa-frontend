'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { NotificationCategory, UnreadCount } from '@remoa/contracts';
import { isNotificationType, notificationCategories } from '@remoa/contracts/constants';
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
  const type = row.type;
  if (!isNotificationType(type) || !row.data) return '';
  try {
    return t('notifications.live', { title: textOf({ type, data: row.data } as Textable, tz).title });
  } catch {
    return '';
  }
};

/** `userId` comes from the server (profile in the shell): no `getUser()` round trip in the browser (D-994). Without it there is no Realtime, only the poll. */
export function NotificationsProvider({ timezone = 'America/Sao_Paulo', userId, children }: { timezone?: string; userId?: string; children: ReactNode }) {
  const [unread, setUnread] = useState<UnreadCount>(ZERO);
  const [version, setVersion] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const alive = useRef(true);
  const connected = useRef(false);

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
    // Fallback only while the Realtime channel is down: poll every 60 s while the tab is visible (FR-9, FR-54, P-442).
    const id = setInterval(() => !connected.current && document.visibilityState === 'visible' && void refresh(), POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onVisible);

    let cleanup = () => {};
    void (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        if (!userId) return;
        // Local session read (no network, unlike getUser): without a JWT on the socket the channel joins as `anon`, RLS filters every
        // INSERT, yet the status is SUBSCRIBED, so the poll stays off and the badge never moves (G21/D-994 regression, e2e notifications).
        // Joining as `anon` also makes Realtime reject the filter ("invalid column for filter user_id": anon has no SELECT on
        // notifications), so no session means no channel, just the poll. setAuth is async: await it so the join carries the JWT.
        const { data } = await supabase.auth.getSession();
        if (!alive.current || !data.session) return;
        await supabase.realtime.setAuth(data.session.access_token);
        if (!alive.current) return;
        const channel = supabase
          .channel(`notifications:${userId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (p) => {
            if (p.eventType === 'INSERT') setAnnouncement(announce(p.new, timezone));
            changed();
          })
          .subscribe((status) => {
            const was = connected.current;
            connected.current = status === 'SUBSCRIBED';
            if (connected.current && !was) void refresh(); // catch up on whatever came while the channel was down
          });
        cleanup = () => void supabase.removeChannel(channel);
      } catch {
        /* no Realtime: the poll above keeps the badge fresh */
      }
    })();
    return () => {
      alive.current = false;
      connected.current = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      cleanup();
    };
  }, [refresh, changed, timezone, userId]);

  const value = useMemo(() => ({ unread, timezone, version, announcement, changed }), [unread, timezone, version, announcement, changed]);
  return (
    <Context.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="sr-only">{announcement}</div>
    </Context.Provider>
  );
}
