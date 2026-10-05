'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { addDays, dayAria, groupByDay, makeKey, monthGrid, parseKey, timeOf, timeRange, weekdayShort } from './dates';
import { labelTone } from './palette';
import { slideClass, useSlide } from './slide';
import type { CalendarEventItem, CalendarLabelItem, DayKey } from './types';

/**
 * CalendarMonthGrid (F25 FR-4/FR-20): 6 × 7, domingo primeiro, `role="grid"`; célula rotulada "terça, 6 de outubro, 2 compromissos".
 * Hoje = círculo na cor da marca; outros meses esmaecidos; até 3 compromissos por dia (horário + título, barra e fundo da etiqueta) e "+N mais".
 * Clicar no dia chama `onDayClick`; cada compromisso é um botão (`onEventClick`). Setas movem o foco entre os dias (roving tabindex).
 * A grade desliza 450 ms para o lado da navegação (movimento reduzido: sem deslize). Datas já resolvidas: `today` e `timeZone` do perfil.
 * ponytail: setas param nas bordas da grade visível; trocar de mês pelo teclado fica com os botões da barra.
 */
export type CalendarMonthGridProps = {
  year: number;
  month: number;
  today: DayKey;
  timeZone: string;
  events: readonly CalendarEventItem[];
  labels: readonly CalendarLabelItem[];
  onDayClick: (day: DayKey) => void;
  onEventClick: (id: string) => void;
  text: { gridLabel: string; allDay: string; count: (n: number) => string; more: (n: number) => string };
};

export function CalendarMonthGrid({ year, month, today, timeZone, events, labels, onDayClick, onEventClick, text }: CalendarMonthGridProps) {
  const days = monthGrid(year, month);
  const byDay = groupByDay(events, timeZone);
  const labelOf = (id: string) => labels.find((l) => l.id === id);
  const dir = useSlide(year * 12 + month);
  const first = makeKey(year, month, 1);
  const [focus, setFocus] = useState<DayKey>(days.includes(today) ? today : first);
  const focusKey = days.includes(focus) ? focus : days.includes(today) ? today : first;
  const refs = useRef(new Map<DayKey, HTMLElement>());

  const onKey = (e: KeyboardEvent<HTMLElement>, key: DayKey) => {
    if (e.target !== e.currentTarget) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step !== undefined) {
      e.preventDefault();
      const next = addDays(key, step);
      if (!days.includes(next)) return;
      setFocus(next);
      refs.current.get(next)?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onDayClick(key);
    }
  };

  return (
    <div role="grid" aria-label={text.gridLabel} className="overflow-hidden rounded-list border border-border bg-surface">
      <div role="row" className="grid grid-cols-7 border-b border-divider bg-soft">
        {days.slice(0, 7).map((d) => (
          <span key={d} role="columnheader" className="px-2.5 py-3 text-xs font-bold uppercase tracking-[0.06em] text-muted">{weekdayShort(d)}</span>
        ))}
      </div>
      <div key={year * 12 + month} className={slideClass(dir)}>
        {Array.from({ length: 6 }, (_, w) => (
          <div key={w} role="row" className="grid grid-cols-7">
            {days.slice(w * 7, w * 7 + 7).map((d) => {
              const inMonth = parseKey(d).month === month;
              const isToday = d === today;
              const list = byDay.get(d) ?? [];
              return (
                <div
                  key={d}
                  role="gridcell"
                  ref={(el) => { if (el) refs.current.set(d, el); else refs.current.delete(d); }}
                  tabIndex={d === focusKey ? 0 : -1}
                  aria-label={`${dayAria(d)}, ${text.count(list.length)}`}
                  aria-current={isToday ? 'date' : undefined}
                  onFocus={(e) => { if (e.target === e.currentTarget) setFocus(d); }}
                  onKeyDown={(e) => onKey(e, d)}
                  onClick={() => onDayClick(d)}
                  className={`flex min-h-[124px] cursor-pointer flex-col gap-1 border-b border-r border-divider p-1.5 outline-none last:border-r-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary max-lg:min-h-[88px] ${inMonth ? 'bg-surface' : 'bg-soft'}`}
                >
                  <span aria-hidden="true" className={`flex size-7 items-center justify-center rounded-full text-[13px] ${isToday ? 'bg-primary font-bold text-on-primary' : inMonth ? 'font-bold text-ink' : 'font-medium text-muted'}`}>{parseKey(d).day}</span>
                  <div className={`flex flex-col gap-1 ${inMonth ? '' : 'opacity-65'}`}>
                    {list.slice(0, 3).map((e) => {
                      const tone = labelTone(labelOf(e.labelId)?.color ?? '#8F8AAE');
                      return (
                        <button
                          key={e.id}
                          type="button"
                          aria-label={`${e.title}, ${timeRange(e, timeZone, text.allDay)}`}
                          onClick={(ev) => { ev.stopPropagation(); onEventClick(e.id); }}
                          className="flex min-h-6 w-full items-center gap-1 truncate rounded-[7px] border-l-[3px] px-1.5 text-left text-xs font-bold focus-visible:outline-2 focus-visible:outline-primary max-lg:min-h-0"
                          style={{ background: tone.bg, color: tone.text, borderLeftColor: tone.dot }}
                        >
                          {e.allDay ? null : <span className="shrink-0 font-semibold">{timeOf(e.startsAt, timeZone)}</span>}
                          <span className="truncate">{e.title}</span>
                        </button>
                      );
                    })}
                    {list.length > 3 ? (
                      <button type="button" onClick={(ev) => { ev.stopPropagation(); onDayClick(d); }} className="min-h-6 self-start rounded-[7px] px-1.5 text-left text-xs font-bold text-muted hover:text-primary-deep focus-visible:outline-2 focus-visible:outline-primary">
                        {text.more(list.length - 3)}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
