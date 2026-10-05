import { vi } from 'vitest';
import * as m from '@remoa/contracts/mocks';

/** `api()` double that routes /v1/notifications/* to the in-memory contract mocks (until the real API is the default in tests). */
export async function fakeApi(path: string, init?: RequestInit) {
  const url = new URL(path, 'http://x');
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  const u = 'u';
  const p = url.pathname;
  if (p === '/v1/notifications/unread-count') return m.getUnreadCount(u);
  if (p === '/v1/notifications/read') return m.markNotificationsRead(u, body);
  if (p === '/v1/notifications/prefs') return init?.method === 'PATCH' ? m.updateNotificationPrefs(u, body) : m.getNotificationPrefs(u);
  if (p === '/v1/notifications' && !init?.method) return m.listNotifications(u, Object.fromEntries(url.searchParams));
  if (init?.method === 'DELETE') return m.dismissNotification(u, p.split('/').pop()!);
  return { ok: false as const, error: { code: 'not_found' as const, message: p } };
}
export const apiMock = vi.fn(fakeApi);
