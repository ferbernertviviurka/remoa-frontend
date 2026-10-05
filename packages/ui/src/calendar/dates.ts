import type { CalendarEventItem, DayKey } from './types';

const LOCALE = 'pt-BR';
const p2 = (n: number) => String(n).padStart(2, '0');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const keyFmt = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string, kind: 'key' | 'time') {
  const id = `${kind}|${tz}`;
  let f = keyFmt.get(id);
  if (!f) {
    f = kind === 'key'
      ? new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
      : new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    keyFmt.set(id, f);
  }
  return f;
}

/** Dia (YYYY-MM-DD) de um instante, no fuso dado. */
export const dayKeyOf = (iso: string | Date, timeZone: string): DayKey => fmt(timeZone, 'key').format(new Date(iso));
/** Hora (HH:mm) de um instante, no fuso dado. */
export const timeOf = (iso: string | Date, timeZone: string): string => fmt(timeZone, 'time').format(new Date(iso));
export const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

export const makeKey = (y: number, m0: number, d: number): DayKey => `${y}-${p2(m0 + 1)}-${p2(d)}`;
const utc = (key: DayKey) => new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10))));
export const parseKey = (key: DayKey) => ({ year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) - 1, day: Number(key.slice(8, 10)) });
export const addDays = (key: DayKey, n: number): DayKey => { const d = utc(key); d.setUTCDate(d.getUTCDate() + n); return makeKey(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
export const diffDays = (a: DayKey, b: DayKey) => Math.round((utc(b).getTime() - utc(a).getTime()) / 86400000);
export const weekdayOf = (key: DayKey) => utc(key).getUTCDay();
export const startOfWeek = (key: DayKey) => addDays(key, -weekdayOf(key));
export const weekDays = (key: DayKey): DayKey[] => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(key), i));
/** 6 × 7 dias, domingo primeiro, a partir do mês `month0` de `year`. */
export const monthGrid = (year: number, month0: number): DayKey[] => { const first = makeKey(year, month0, 1); const s = startOfWeek(first); return Array.from({ length: 42 }, (_, i) => addDays(s, i)); };
export const shiftMonth = (year: number, month0: number, by: number) => { const t = year * 12 + month0 + by; return { year: Math.floor(t / 12), month: ((t % 12) + 12) % 12 }; };

const f = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', ...opts });
const dot = (s: string) => s.replace(/\./g, '');
const wdShort = f({ weekday: 'short' }), wdLong = f({ weekday: 'long' }), dmLong = f({ day: 'numeric', month: 'long' }), dmShort = f({ day: 'numeric', month: 'short' }), monLong = f({ month: 'long' }), monYear = f({ month: 'long', year: 'numeric' });
/** "seg" */ export const weekdayShort = (key: DayKey) => dot(wdShort.format(utc(key)));
/** "terça" (sem "-feira") */ export const weekdayName = (key: DayKey) => wdLong.format(utc(key)).replace('-feira', '');
/** "terça, 6 de outubro" (rótulo da célula) */ export const dayAria = (key: DayKey) => `${weekdayName(key)}, ${dmLong.format(utc(key))}`;
/** "seg, 5 de out" */ export const shortDate = (key: DayKey) => `${weekdayShort(key)}, ${dot(dmShort.format(utc(key)))}`;
/** "Terça-feira, 6 de outubro" */ export const longDate = (key: DayKey) => cap(`${wdLong.format(utc(key))}, ${dmLong.format(utc(key))}`);
/** "outubro" */ export const monthName = (key: DayKey) => monLong.format(utc(key));
/** "Outubro de 2026" */ export const monthTitle = (year: number, month0: number) => cap(monYear.format(new Date(Date.UTC(year, month0, 1))));
/** "4 – 10 de outubro de 2026" (título da semana) */ export const weekTitle = (key: DayKey) => { const d = weekDays(key); return new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).formatRange(utc(d[0]!), utc(d[6]!)); };
/** "5 de outubro" */ export const dayMonth = (key: DayKey) => dmLong.format(utc(key));

export function timeRange(e: CalendarEventItem, tz: string, allDayText: string) {
  if (e.allDay) return allDayText;
  const s = timeOf(e.startsAt, tz);
  return e.endsAt ? `${s} – ${timeOf(e.endsAt, tz)}` : s;
}

export const sortEvents = (a: CalendarEventItem, b: CalendarEventItem) => (a.allDay === b.allDay ? a.startsAt.localeCompare(b.startsAt) : a.allDay ? -1 : 1);

export function groupByDay(events: readonly CalendarEventItem[], tz: string) {
  const map = new Map<DayKey, CalendarEventItem[]>();
  for (const e of [...events].sort(sortEvents)) {
    const k = dayKeyOf(e.startsAt, tz);
    const list = map.get(k);
    if (list) list.push(e); else map.set(k, [e]);
  }
  return map;
}

/** Sobreposições da semana: colunas lado a lado dentro de cada grupo de blocos que se tocam. */
export function layoutBlocks<T extends { start: number; end: number }>(blocks: readonly T[]) {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || a.end - b.end);
  const out: Array<{ block: T; col: number; cols: number }> = [];
  let cluster: Array<{ block: T; col: number; cols: number }> = [];
  let ends: number[] = [];
  let clusterEnd = -1;
  const flush = () => { for (const c of cluster) c.cols = ends.length; out.push(...cluster); cluster = []; ends = []; };
  for (const b of sorted) {
    if (cluster.length && b.start >= clusterEnd) flush();
    let col = ends.findIndex((e) => e <= b.start);
    if (col < 0) { col = ends.length; ends.push(b.end); } else ends[col] = b.end;
    clusterEnd = Math.max(clusterEnd, b.end);
    cluster.push({ block: b, col, cols: 1 });
  }
  flush();
  return out;
}
