'use client';

import { addDays, groupByDay, monthName, parseKey, timeRange, weekdayShort } from './dates';
import { labelTone } from './palette';
import type { CalendarEventItem, CalendarLabelItem, DayKey } from './types';

/**
 * CalendarAgendaList (F25 FR-6): próximos `days` (30) dias agrupados por dia; dias sem compromisso não aparecem.
 * Cada dia: data em destaque (hoje = círculo da marca), e por compromisso horário, título, local e etiqueta. Cascata de 60 ms entre dias.
 * É também a alternativa em lista da grade (FR-20). "Carregar mais" só aparece se `onLoadMore` vier.
 */
export type CalendarAgendaListProps = {
  today: DayKey;
  timeZone: string;
  events: readonly CalendarEventItem[];
  labels: readonly CalendarLabelItem[];
  days?: number;
  onEventClick: (id: string) => void;
  onLoadMore?: () => void;
  text: { label: string; todayWord: string; allDay: string; loadMore: string };
};

export function CalendarAgendaList({ today, timeZone, events, labels, days = 30, onEventClick, onLoadMore, text }: CalendarAgendaListProps) {
  const byDay = groupByDay(events, timeZone);
  const last = addDays(today, days - 1);
  const groups = [...byDay.entries()].filter(([k]) => k >= today && k <= last).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div className="rounded-list border border-border bg-surface p-2">
      <ol aria-label={text.label} className="m-0 flex list-none flex-col p-0">
        {groups.map(([k, list], i) => (
          <li key={k} className={`slide flex gap-4 px-2 py-2 ${i ? 'border-t border-divider' : ''}`} style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex w-[130px] shrink-0 items-center gap-3">
              <span aria-hidden="true" className={`flex size-[52px] shrink-0 items-center justify-center rounded-full font-display text-[22px] font-extrabold ${k === today ? 'bg-primary text-on-primary' : 'bg-chip text-primary-deep'}`}>{parseKey(k).day}</span>
              <span className="flex flex-col leading-tight">
                <span className="font-bold text-ink">{k === today ? text.todayWord : weekdayShort(k).replace(/^./, (c) => c.toUpperCase())}</span>
                <span className="text-xs text-muted">{monthName(k)}</span>
              </span>
            </div>
            <ul className="m-0 flex min-w-0 grow list-none flex-col gap-2 p-0">
              {list.map((e) => {
                const label = labels.find((l) => l.id === e.labelId);
                const t = labelTone(label?.color ?? '#8F8AAE');
                return (
                  <li key={e.id}>
                    <button type="button" onClick={() => onEventClick(e.id)} className="flex min-h-[52px] w-full items-center gap-4 rounded-[12px] border-l-[3px] px-4 py-2 text-left focus-visible:outline-2 focus-visible:outline-primary" style={{ background: t.bg, borderLeftColor: t.dot }}>
                      <span className="w-[130px] shrink-0 text-sm font-bold max-sm:w-[84px]" style={{ color: t.text }}>{timeRange(e, timeZone, text.allDay)}</span>
                      <span className="flex min-w-0 grow flex-col leading-tight">
                        <span className="truncate font-bold text-ink">{e.title}</span>
                        {e.location ? <span className="truncate text-[13px] text-muted">{e.location}</span> : null}
                      </span>
                      {label ? <span className="shrink-0 rounded-pill bg-surface px-2.5 py-0.5 text-xs font-bold" style={{ color: t.text }}>{label.name}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
      {onLoadMore ? (
        <button type="button" onClick={onLoadMore} className="mt-1 min-h-11 w-full rounded-[12px] text-sm font-bold text-primary-deep hover:bg-primary-tint focus-visible:outline-2 focus-visible:outline-primary">{text.loadMore}</button>
      ) : null}
    </div>
  );
}
