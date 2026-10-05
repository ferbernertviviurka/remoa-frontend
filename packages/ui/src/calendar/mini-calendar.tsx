'use client';

import { Icon } from '../icons';
import { dayAria, monthGrid, monthTitle, parseKey, shiftMonth, weekdayShort } from './dates';
import type { DayKey } from './types';

/**
 * MiniCalendar (F25 FR-8): navega por mês, marca com ponto os dias com compromisso, seleciona o dia (âncora da semana).
 * Clicar em dia de outro mês seleciona e navega até ele (chama `onSelectDay` e `onMonthChange`).
 */
export type MiniCalendarProps = {
  year: number;
  month: number;
  today: DayKey;
  selected?: DayKey;
  /** dias (YYYY-MM-DD) com compromisso */
  eventDays: readonly DayKey[];
  onMonthChange: (year: number, month: number) => void;
  onSelectDay: (day: DayKey) => void;
  text: { label: string; prev: string; next: string; hasEvents: string };
};

export function MiniCalendar({ year, month, today, selected, eventDays, onMonthChange, onSelectDay, text }: MiniCalendarProps) {
  const days = monthGrid(year, month);
  const go = (by: number) => { const m = shiftMonth(year, month, by); onMonthChange(m.year, m.month); };
  const arrow = 'flex size-11 items-center justify-center rounded-btn text-ink hover:bg-primary-tint focus-visible:outline-2 focus-visible:outline-primary';
  return (
    <div role="group" aria-label={text.label} className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span aria-live="polite" className="font-display text-base font-bold text-ink">{monthTitle(year, month)}</span>
        <span className="flex">
          <button type="button" aria-label={text.prev} onClick={() => go(-1)} className={arrow}><Icon name="left" size={18} /></button>
          <button type="button" aria-label={text.next} onClick={() => go(1)} className={arrow}><Icon name="right" size={18} /></button>
        </span>
      </div>
      <div role="grid" aria-label={monthTitle(year, month)}>
        <div role="row" className="grid grid-cols-7">
          {days.slice(0, 7).map((d) => <span key={d} role="columnheader" className="py-1.5 text-center text-xs font-bold uppercase text-muted">{weekdayShort(d).charAt(0)}</span>)}
        </div>
        {Array.from({ length: 6 }, (_, w) => (
          <div key={w} role="row" className="grid grid-cols-7">
            {days.slice(w * 7, w * 7 + 7).map((d) => {
              const inMonth = parseKey(d).month === month;
              const isToday = d === today;
              const isSel = d === selected;
              const has = eventDays.includes(d);
              return (
                <span key={d} role="gridcell" className="flex justify-center">
                  <button
                    type="button"
                    aria-label={`${dayAria(d)}${has ? `, ${text.hasEvents}` : ''}`}
                    aria-current={isToday ? 'date' : undefined}
                    aria-pressed={isSel}
                    onClick={() => { onSelectDay(d); if (!inMonth) { const p = parseKey(d); onMonthChange(p.year, p.month); } }}
                    className={`relative flex size-9 items-center justify-center rounded-full text-[13px] focus-visible:outline-2 focus-visible:outline-primary max-lg:size-11 ${isToday ? 'bg-primary font-extrabold text-on-primary' : `hover:bg-primary-tint ${inMonth ? 'text-ink' : 'text-muted'} ${isSel ? 'font-extrabold outline-2 -outline-offset-2 outline-primary' : 'font-medium'}`}`}
                  >
                    {parseKey(d).day}
                    {has && !isToday ? <span aria-hidden="true" className="absolute bottom-1 size-1 rounded-full bg-primary" /> : null}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
