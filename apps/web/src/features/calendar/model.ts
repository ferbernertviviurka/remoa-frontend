// F25: pure helpers between the API contract (`@remoa/contracts/calendar`) and the presentational `@remoa/ui` calendar components.
import { CALENDAR_PALETTE, CALENDAR_REMINDER_RULES, calendarColors } from '@/lib/contracts-lite'; // zod-free (P-507)
import type {
  CalendarColor,
  CalendarEvent,
  CalendarEventInput,
  CalendarLabel,
  CalendarReminderKind,
  ReminderPlan,
  UpcomingEvent,
} from '@remoa/contracts';
import { addDays, dayKeyOf, makeKey, parseKey, shiftMonth, type CalendarEventItem, type CalendarLabelItem, type CalendarView, type DayKey, type EventFormValue } from '@remoa/ui';

/** The state the page keeps: the wire event with instants as ISO strings (JSON gives strings, the mocks give Dates). */
export type Ev = {
  id: string;
  title: string;
  labelId: string;
  date: DayKey;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  location: string | null;
  description: string | null;
  coverAssetId: string | null;
  coverUrl: string | null;
  remindD1: boolean;
  remindD0: boolean;
  reminders: { kind: CalendarReminderKind; sendAt: string; status: ReminderPlan['status'] }[];
  /** Optimistic row not yet confirmed by the API. */
  pending?: boolean;
};

const iso = (v: Date | string) => new Date(v).toISOString();

export const toEv = (e: CalendarEvent): Ev => ({
  id: e.id, title: e.title, labelId: e.labelId, date: e.date, allDay: e.allDay, startTime: e.startTime, endTime: e.endTime,
  startsAt: iso(e.startsAt), endsAt: e.endsAt ? iso(e.endsAt) : null, timezone: e.timezone, location: e.location, description: e.description,
  coverAssetId: e.cover?.assetId ?? null, coverUrl: e.cover?.urls.w800 ?? null, remindD1: e.remindD1, remindD0: e.remindD0,
  reminders: e.reminders.map((r) => ({ kind: r.kind, sendAt: iso(r.sendAt), status: r.status })),
});

export const toItem = (e: Ev): CalendarEventItem => ({
  id: e.id, title: e.title, labelId: e.labelId, startsAt: e.startsAt, endsAt: e.endsAt, allDay: e.allDay, location: e.location, description: e.description, coverUrl: e.coverUrl,
});

/** Contract colour key → the hex the ui components take (D-741). */
export const colorHex = (c: CalendarColor) => CALENDAR_PALETTE[c].dot;
/** Hex from the ui picker → contract key (the ui palette uses the same hex). */
export const colorKey = (hex: string): CalendarColor => calendarColors.find((k) => CALENDAR_PALETTE[k].dot.toLowerCase() === hex.toLowerCase()) ?? 'gray';

export const toLabelItem = (l: Pick<CalendarLabel, 'id' | 'name' | 'color'>): CalendarLabelItem => ({ id: l.id, name: l.name, color: colorHex(l.color) });

/** Instant of a local `date time` in `timeZone` (DST-safe: one correction pass). */
export function zonedInstant(date: DayKey, time: string | null, timeZone: string): Date {
  const [h, m] = (time ?? '00:00').split(':').map(Number);
  const { year, month, day } = parseKey(date);
  const want = Date.UTC(year, month, day, h, m);
  const offset = (at: number) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(at)).map((x) => [x.type, Number(x.value)]));
    return Date.UTC(p.year!, p.month! - 1, p.day!, p.hour!, p.minute!) - at;
  };
  const first = want - offset(want);
  return new Date(want - offset(first));
}

const p2 = (n: number) => String(n).padStart(2, '0');

/**
 * FR-13 / Q-051 in the profile's local clock: d1 = 18:00 the day before; d0 = 07:00, or 1 h before a start before 08:00, never before 05:00.
 * Pure wall-clock arithmetic, so DST cannot move it; the API plan (`ReminderPlan.sendAt`) is the source of truth for status.
 */
export function reminderLocal(kind: CalendarReminderKind, date: DayKey, startTime: string | null): { date: DayKey; time: string } {
  const r = CALENDAR_REMINDER_RULES;
  if (kind === 'd1') return { date: addDays(date, -1), time: `${p2(r.d1Hour)}:00` };
  let min = r.d0Hour * 60;
  if (startTime) {
    const start = Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5));
    if (start < r.earlyStartBeforeHour * 60) min = Math.max(r.notBeforeHour * 60, start - r.earlyLeadMinutes);
  }
  return { date, time: `${p2(Math.floor(min / 60))}:${p2(min % 60)}` };
}

/** Months to ask for: the one shown ± 1 (FR-22). Agenda and Gallery hang from today; Month and Week from the anchor. Span <= 92 days (API caps at 100). */
export function rangeFor(view: CalendarView, anchor: DayKey, today: DayKey): { from: DayKey; to: DayKey } {
  const base = parseKey(view === 'agenda' || view === 'gallery' ? today : anchor);
  const a = shiftMonth(base.year, base.month, -1);
  const b = shiftMonth(base.year, base.month, 1);
  const last = new Date(Date.UTC(b.year, b.month + 1, 0)).getUTCDate();
  return { from: makeKey(a.year, a.month, 1), to: makeKey(b.year, b.month, last) };
}
export const covers = (have: { from: DayKey; to: DayKey } | null, need: { from: DayKey; to: DayKey }) => !!have && have.from <= need.from && have.to >= need.to;

/** Days the visible grid needs, so a month/week move inside the loaded range never refetches. */
export function visibleRange(view: CalendarView, anchor: DayKey, today: DayKey): { from: DayKey; to: DayKey } {
  const p = parseKey(anchor);
  if (view === 'month') {
    const first = makeKey(p.year, p.month, 1);
    const start = addDays(first, -new Date(`${first}T00:00:00Z`).getUTCDay());
    return { from: start, to: addDays(start, 41) };
  }
  if (view === 'week') {
    const start = addDays(anchor, -new Date(`${anchor}T00:00:00Z`).getUTCDay());
    return { from: start, to: addDays(start, 6) };
  }
  return { from: today, to: addDays(today, view === 'agenda' ? 29 : 89) };
}

export const emptyForm = (date: DayKey, labelId: string): EventFormValue => ({
  title: '', labelId, date, allDay: false, start: '09:00', end: '', location: '', description: '', cover: null, remindD1: true, remindD0: true,
});

export const formFromEv = (e: Ev): EventFormValue => ({
  title: e.title, labelId: e.labelId, date: e.date, allDay: e.allDay, start: e.startTime ?? '', end: e.endTime ?? '', location: e.location ?? '', description: e.description ?? '',
  cover: e.coverUrl ? { name: '', url: e.coverUrl } : null, remindD1: e.remindD1, remindD0: e.remindD0,
});

/** No start time means "dia inteiro" (business rule). */
export function inputFromForm(v: EventFormValue, coverAssetId: string | null): CalendarEventInput {
  const allDay = v.allDay || !v.start;
  return {
    title: v.title.trim(), labelId: v.labelId, date: v.date, allDay, startTime: allDay ? null : v.start, endTime: allDay || !v.end ? null : v.end,
    location: v.location.trim() || null, description: v.description.trim() || null, coverAssetId, remindD1: v.remindD1, remindD0: v.remindD0,
  };
}

/** Optimistic row: same fields the API would echo, reminders unknown until it answers. */
export function optimisticEv(id: string, input: CalendarEventInput, timeZone: string, coverUrl: string | null): Ev {
  const startsAt = zonedInstant(input.date, input.allDay ? null : (input.startTime ?? null), timeZone);
  return {
    id, title: input.title, labelId: input.labelId, date: input.date, allDay: !!input.allDay, startTime: input.startTime ?? null, endTime: input.endTime ?? null,
    startsAt: startsAt.toISOString(), endsAt: input.endTime ? zonedInstant(input.date, input.endTime, timeZone).toISOString() : null, timezone: timeZone,
    location: input.location ?? null, description: input.description ?? null, coverAssetId: input.coverAssetId ?? null, coverUrl,
    remindD1: input.remindD1 ?? true, remindD0: input.remindD0 ?? true, reminders: [], pending: true,
  };
}

/** Labels as the Hoje card needs them, taken from the events themselves. */
export function labelsOfUpcoming(events: readonly UpcomingEvent[]): CalendarLabelItem[] {
  const m = new Map<string, CalendarLabelItem>();
  for (const e of events) if (!m.has(e.labelId)) m.set(e.labelId, { id: e.labelId, name: e.labelName, color: colorHex(e.color) });
  return [...m.values()];
}

export const upcomingItem = (e: UpcomingEvent): CalendarEventItem => ({
  id: e.id, title: e.title, labelId: e.labelId, startsAt: iso(e.startsAt), endsAt: null, allDay: e.allDay, location: e.location,
});

export const todayKey = (now: Date, timeZone: string) => dayKeyOf(now, timeZone);

/** Telemetry `label` property: never the user's own text. */
export const labelKind = (l: Pick<CalendarLabel, 'systemKey'> | undefined) => l?.systemKey ?? 'custom';
