// P-507 (D-1070): the few contract constants the app shell and Hoje read in the browser, without zod. In `@remoa/contracts` they live
// in modules that also build zod schemas, so importing one of them ships zod (~13 KB gzip) in every page's initial JS.
// Kept in sync by `satisfies` (literal types) and by contracts-lite.test.ts (deep equality with the contract).
// ponytail: mirror until CCR-P507 gives `@remoa/contracts` a zod-free `constants` subpath; then delete this file and import from it.
import type {
  CalendarColor,
  CALENDAR_LIMITS as C_CALENDAR_LIMITS,
  CALENDAR_REMINDER_RULES as C_CALENDAR_REMINDER_RULES,
  calendarColors as C_calendarColors,
  notificationCategories as C_notificationCategories,
  notificationTypes as C_notificationTypes,
  PLAN_LIMITS as C_PLAN_LIMITS,
  REVIEW_SESSION_MAX as C_REVIEW_SESSION_MAX,
} from '@remoa/contracts';

export const PLAN_LIMITS = {
  free: { limits: { ai_grades: 20, ai_generations: 0, boards: 2, cards: 50 }, newCardsPerDay: 10, ankiImportMaxCards: 200, ankiImports: 1 },
  pro: { limits: { ai_grades: 50, ai_generations: 5, boards: null, cards: null }, newCardsPerDay: null, ankiImportMaxCards: null, ankiImports: null },
  founder: { limits: { ai_grades: null, ai_generations: null, boards: null, cards: null }, newCardsPerDay: null, ankiImportMaxCards: null, ankiImports: null },
} as const satisfies typeof C_PLAN_LIMITS;

export const notificationTypes = [
  'calendar_d1', 'calendar_d0', 'calendar_digest', 'review_reminder', 'map_ready', 'referral_reward', 'support_reply', 'purchase',
  'waitlist_joined', 'inactivity', 'account', 'password_reset', 'support_received', 'password_changed', 'welcome', 'onboarding_nudge',
  'payment_receipt', 'admin_alert', 'dispute_resolved',
] as const satisfies typeof C_notificationTypes;

export const notificationCategories = ['calendar', 'review', 'maps', 'referrals', 'support', 'account_billing', 'store'] as const satisfies typeof C_notificationCategories;

export const CALENDAR_LIMITS = {
  titleMin: 2,
  titleMax: 120,
  locationMax: 160,
  descriptionMax: 2000,
  labelNameMin: 2,
  labelNameMax: 40,
  labels: 20,
  coverMaxBytes: 5 * 1024 * 1024,
  rangeMaxDays: 100,
  upcomingDefault: 4,
  upcomingMax: 10,
  duplicateDays: 7,
  deletedRetentionDays: 30,
  defaultDurationMinutes: 60,
} as const satisfies typeof C_CALENDAR_LIMITS;

export const CALENDAR_REMINDER_RULES = { d1Hour: 18, d0Hour: 7, earlyStartBeforeHour: 8, earlyLeadMinutes: 60, notBeforeHour: 5 } as const satisfies typeof C_CALENDAR_REMINDER_RULES;

export const calendarColors = ['orange', 'amber', 'purple', 'teal', 'gray', 'blue', 'pink', 'green'] as const satisfies typeof C_calendarColors;

export const CALENDAR_PALETTE: Record<CalendarColor, { dot: string; text: string; bg: string }> = {
  orange: { dot: '#C2410C', text: '#9A3412', bg: '#FFEDD5' },
  amber: { dot: '#CA8A04', text: '#854D0E', bg: '#FEF3C7' },
  purple: { dot: '#6D5BD0', text: '#3F3579', bg: '#F3F2FB' },
  teal: { dot: '#0F766E', text: '#0F766E', bg: '#CCFBF1' },
  gray: { dot: '#8F8AAE', text: '#5F5B7A', bg: '#EEEDF6' },
  blue: { dot: '#2563EB', text: '#1E40AF', bg: '#DBEAFE' },
  pink: { dot: '#BE185D', text: '#9D174D', bg: '#FCE7F3' },
  green: { dot: '#15803D', text: '#166534', bg: '#DCFCE7' },
};

export const REVIEW_SESSION_MAX = 100 satisfies typeof C_REVIEW_SESSION_MAX;

/** `notificationTypeSchema.safeParse(x).success`, without zod. */
export const isNotificationType = (x: unknown): x is (typeof notificationTypes)[number] => (notificationTypes as readonly unknown[]).includes(x);
