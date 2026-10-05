// FR-15. Never the notification text.
import type { NotificationPrefKey, NotificationType } from '@remoa/contracts';
import { track } from '@/lib/analytics';

export const notifTrack = {
  bellOpened: (unread: number) => track('notif_bell_opened', { unread }),
  clicked: (type: NotificationType) => track('notif_clicked', { type }),
  markedRead: (scope: 'one' | 'all') => track('notif_marked_read', { scope }),
  removed: () => track('notif_removed', {}),
  prefChanged: (key: NotificationPrefKey, channel: 'in_app' | 'email', value: boolean) => track('notif_pref_changed', { key, channel, value }),
  pauseToggled: (on: boolean) => track('notif_pause_toggled', { on }),
};
