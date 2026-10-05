import type { InAppNotificationType, Notification, NotificationCategory, NotificationDataMap } from '@remoa/contracts';
import { t } from '@remoa/strings';
import type { NotificationGroup, NotificationKind, NotificationView } from '@remoa/ui';

const KIND: Record<InAppNotificationType, NotificationKind> = {
  calendar_d1: 'calendar', calendar_d0: 'calendar', calendar_digest: 'calendar', review_reminder: 'review', map_ready: 'map',
  referral_reward: 'referral', support_reply: 'support', purchase: 'purchase', waitlist_joined: 'store',
};
const CATEGORY_KEY = { calendar: 'calendar', review: 'review', maps: 'maps', referrals: 'referrals', support: 'support', account_billing: 'account', store: 'store' } as const satisfies Record<NotificationCategory, string>;
export const categoryLabel = (c: NotificationCategory) => t(`notifications.category.${CATEGORY_KEY[c]}`);

const time = (iso: string, tz: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: tz });

/** D-742: the API stores no text; title and body come from `type` + `data`. */
export type Textable = { [T in InAppNotificationType]: { type: T; data: NotificationDataMap[T] } }[InAppNotificationType];
export function textOf(n: Textable, tz: string): { title: string; body: string } {
  switch (n.type) {
    case 'calendar_d1':
    case 'calendar_d0': {
      const d = n.data;
      const when = d.allDay ? t('notifications.type.calendarAllDay') : time(d.startsAt, tz);
      return { title: t(n.type === 'calendar_d1' ? 'notifications.type.calendarD1.title' : 'notifications.type.calendarD0.title', { title: d.title }), body: d.location ? t('notifications.type.calendarBody', { time: when, location: d.location }) : when };
    }
    case 'calendar_digest': {
      const k = n.data.window === 'd1' ? 'calendarDigestD1' : 'calendarDigestD0';
      return { title: t(`notifications.type.${k}.title`, { count: n.data.count }), body: t(`notifications.type.${k}.body`) };
    }
    case 'review_reminder': return { title: t('notifications.type.reviewTitle', { cards: n.data.cards }), body: t('notifications.type.reviewBody') };
    case 'map_ready': return { title: t('notifications.type.mapTitle', { title: n.data.title }), body: t('notifications.type.mapBody', { cards: n.data.cards }) };
    case 'referral_reward': return { title: t(n.data.role === 'referrer' ? 'notifications.type.referrerTitle' : 'notifications.type.refereeTitle'), body: t('notifications.type.referralBody') };
    case 'support_reply': return { title: t('notifications.type.supportTitle', { n: n.data.ticketNumber }), body: t('notifications.type.supportBody') };
    case 'purchase': return { title: t('notifications.type.purchaseTitle'), body: t('notifications.type.purchaseBody', { plan: n.data.planName }) };
    case 'waitlist_joined': return { title: t('notifications.type.waitlistTitle'), body: t('notifications.type.waitlistBody') };
  }
}

const dayKey = (d: Date, tz: string) => d.toLocaleDateString('en-CA', { timeZone: tz });
/** Whole calendar days between two instants, in the profile's time zone. */
export const daysAgo = (then: Date, now: Date, tz: string) => Math.round((Date.parse(dayKey(now, tz)) - Date.parse(dayKey(then, tz))) / 86_400_000);

export function whenOf(then: Date, now: Date, tz: string): string {
  const min = Math.floor((now.getTime() - then.getTime()) / 60_000);
  const days = daysAgo(then, now, tz);
  if (days === 0 && min < 1) return t('notifications.when.now');
  if (days === 0 && min < 60) return t('notifications.when.minutes', { n: min });
  if (days === 0) return t('notifications.when.hours', { n: Math.floor(min / 60) });
  if (days === 1) return t('notifications.when.yesterday');
  return then.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: tz }).replace('.', '');
}

export function toView(n: Notification, tz: string, now = new Date()): NotificationView {
  return { id: n.id, kind: KIND[n.type], ...textOf(n, tz), when: whenOf(new Date(n.createdAt), now, tz), category: categoryLabel(n.category), href: n.href ?? '/app/notificacoes', unread: !n.readAt };
}

/** Hoje / Ontem / Esta semana (2 a 6 dias) / Antes, by calendar day in the profile time zone (FR-2). Input is newest first. */
export function groupViews(items: ReadonlyArray<Notification>, tz: string, now = new Date()): NotificationGroup[] {
  const groups: NotificationGroup[] = (['today', 'yesterday', 'week', 'before'] as const).map((id) => ({ id, label: t(`notifications.group.${id}`), items: [] as NotificationView[] }));
  for (const n of items) {
    const d = daysAgo(new Date(n.createdAt), now, tz);
    (groups[d <= 0 ? 0 : d === 1 ? 1 : d < 7 ? 2 : 3]!.items as NotificationView[]).push(toView(n, tz, now));
  }
  return groups;
}

export const formatMeta = (i: NotificationView) => t('notifications.item.meta', { when: i.when, category: i.category });
