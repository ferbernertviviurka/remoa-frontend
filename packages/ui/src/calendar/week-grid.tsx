'use client';

import { dayAria, dayKeyOf, groupByDay, layoutBlocks, parseKey, timeOf, timeRange, toMinutes, weekDays, weekdayShort } from './dates';
import { labelTone } from './palette';
import { slideClass, useSlide } from './slide';
import type { CalendarEventItem, CalendarLabelItem, DayKey } from './types';

/**
 * CalendarWeekGrid (F25 FR-5): 07:00–23:00 a 48 px/h, linha "dia todo", linha vermelha de agora no dia de hoje,
 * blocos por início/fim (sem fim = 1 h; antes das 07:00 encosta em 07:00), sobreposições em colunas lado a lado.
 * Blocos entram com `popn` (450 ms, 40 ms entre eles); a grade desliza ao trocar de semana. `now` vem de fora (o app atualiza por minuto).
 * Cada dia é uma lista (`ol`) de botões; o rótulo da lista é o dia por extenso.
 */
export type CalendarWeekGridProps = {
  /** qualquer dia da semana (âncora) */
  anchor: DayKey;
  today: DayKey;
  now: Date;
  timeZone: string;
  events: readonly CalendarEventItem[];
  labels: readonly CalendarLabelItem[];
  onEventClick: (id: string) => void;
  text: { allDayRow: string; allDay: string; nowLabel: string };
};

const START = 7 * 60;
const END = 23 * 60;
const PX = 48 / 60;

export function CalendarWeekGrid({ anchor, today, now, timeZone, events, labels, onEventClick, text }: CalendarWeekGridProps) {
  const days = weekDays(anchor);
  const byDay = groupByDay(events, timeZone);
  const dir = useSlide(Number(days[0]!.replace(/-/g, '')));
  const nowMin = toMinutes(timeOf(now, timeZone));
  const hours = Array.from({ length: 17 }, (_, i) => 7 + i);
  const tone = (id: string) => labelTone(labels.find((l) => l.id === id)?.color ?? '#8F8AAE');
  let n = 0;

  return (
    <div className="overflow-hidden rounded-list border border-border bg-surface">
      <div className="grid grid-cols-[58px_repeat(7,1fr)] border-b border-divider bg-soft">
        <span />
        {days.map((d) => (
          <div key={d} className="flex flex-col items-center gap-1 py-2.5">
            <span className="text-xs font-bold uppercase tracking-[0.06em] text-muted">{weekdayShort(d)}</span>
            <span aria-hidden="true" className={`flex size-9 items-center justify-center rounded-full font-display text-lg font-extrabold ${d === today ? 'bg-primary text-on-primary' : 'text-ink'}`}>{parseKey(d).day}</span>
          </div>
        ))}
      </div>
      <div key={days[0]} className={slideClass(dir)}>
        <div className="grid grid-cols-[58px_repeat(7,1fr)] border-b border-divider">
          <span className="self-center pr-2 text-right text-[11px] text-muted">{text.allDayRow}</span>
          {days.map((d) => (
            <ul key={d} aria-label={dayAria(d)} className="m-0 flex min-h-8 list-none flex-col gap-0.5 border-l border-divider p-0.5">
              {(byDay.get(d) ?? []).filter((e) => e.allDay).map((e) => {
                const t = tone(e.labelId);
                return (
                  <li key={e.id}>
                    <button type="button" onClick={() => onEventClick(e.id)} aria-label={`${e.title}, ${text.allDay}`} className="min-h-6 w-full truncate rounded-[7px] border-l-[3px] px-1.5 text-left text-xs font-bold focus-visible:outline-2 focus-visible:outline-primary" style={{ background: t.bg, color: t.text, borderLeftColor: t.dot }}>{e.title}</button>
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
        <div className="relative grid grid-cols-[58px_repeat(7,1fr)]" style={{ height: (END - START) * PX }}>
          <div aria-hidden="true" className="relative">
            {hours.map((h) => (
              <span key={h} className="absolute right-2 text-[11px] text-muted" style={{ top: (h - 7) * 48 - 6 }}>{String(h).padStart(2, '0')}:00</span>
            ))}
          </div>
          {days.map((d) => {
            const blocks = (byDay.get(d) ?? []).filter((e) => !e.allDay).map((e) => {
              const s = Math.min(Math.max(START, toMinutes(timeOf(e.startsAt, timeZone))), END - 30);
              let en = e.endsAt && dayKeyOf(e.endsAt, timeZone) === d ? toMinutes(timeOf(e.endsAt, timeZone)) : s + 60;
              if (e.endsAt && dayKeyOf(e.endsAt, timeZone) > d) en = END;
              if (en <= s) en = s + 60;
              return { e, start: s, end: Math.min(en, END) };
            });
            return (
              <ol key={d} aria-label={dayAria(d)} className={`relative m-0 list-none border-l border-divider p-0 ${d === today ? 'bg-soft' : ''}`}>
                {hours.slice(0, -1).map((h) => <li key={h} aria-hidden="true" className="absolute inset-x-0 border-t border-divider" style={{ top: (h - 7) * 48 }} />)}
                {layoutBlocks(blocks).map(({ block, col, cols }) => {
                  const t = tone(block.e.labelId);
                  return (
                    <li key={block.e.id} className="popn absolute px-px" style={{ top: (block.start - START) * PX, height: Math.max(28, (block.end - block.start) * PX - 2), left: `${(col / cols) * 100}%`, width: `${100 / cols}%`, animationDelay: `${n++ * 40}ms` }}>
                      <button type="button" onClick={() => onEventClick(block.e.id)} aria-label={`${block.e.title}, ${timeRange(block.e, timeZone, text.allDay)}`} className="flex size-full flex-col overflow-hidden rounded-[8px] border-l-[3px] px-2 py-1 text-left text-xs leading-tight focus-visible:outline-2 focus-visible:outline-primary" style={{ background: t.bg, color: t.text, borderLeftColor: t.dot }}>
                        <span className="font-bold">{block.e.title}</span>
                        <span className="font-medium">{timeRange(block.e, timeZone, text.allDay)}</span>
                      </button>
                    </li>
                  );
                })}
                {d === today && nowMin >= START && nowMin <= END ? (
                  <li className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-review" style={{ top: (nowMin - START) * PX }}>
                    <span className="sr-only">{text.nowLabel}</span>
                    <span className="absolute -left-1.5 -top-[5px] size-3 rounded-full bg-review" />
                  </li>
                ) : null}
              </ol>
            );
          })}
        </div>
      </div>
    </div>
  );
}
