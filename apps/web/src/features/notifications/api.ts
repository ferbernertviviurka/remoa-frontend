import type { MarkReadInput, MarkReadResult, NotificationPage, NotificationPrefs, NotificationPrefsPatch, NotificationCategory, UnreadCount } from '@remoa/contracts';
import { api } from '@/lib/api';

// Thin wrappers over /v1/notifications/* (same shapes as the Api.* types in @remoa/contracts; the user is the token).
export const listNotifications = (q: { filter: 'all' | 'unread'; category?: NotificationCategory; cursor?: string }) => {
  const p = new URLSearchParams({ filter: q.filter });
  if (q.category) p.set('category', q.category);
  if (q.cursor) p.set('cursor', q.cursor);
  return api<NotificationPage>(`/v1/notifications?${p}`);
};
export const getUnreadCount = () => api<UnreadCount>('/v1/notifications/unread-count');
export const markRead = (input: MarkReadInput) => api<MarkReadResult>('/v1/notifications/read', { method: 'POST', body: JSON.stringify(input) });
export const dismissNotification = (id: string) => api<null>(`/v1/notifications/${id}`, { method: 'DELETE' });
export const getPrefs = () => api<NotificationPrefs>('/v1/notifications/prefs');
export const patchPrefs = (patch: NotificationPrefsPatch) => api<NotificationPrefs>('/v1/notifications/prefs', { method: 'PATCH', body: JSON.stringify(patch) });
