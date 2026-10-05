'use client';

import type { ComponentType, ReactNode } from 'react';
import { Icon } from '../icons';
import { dayKeyOf, diffDays, parseKey, timeRange, monthName } from './dates';
import { labelTone } from './palette';
import type { CalendarEventItem, CalendarLabelItem, DayKey } from './types';

type LinkEl = ComponentType<{ href: string; className?: string; 'aria-label'?: string; children?: ReactNode }> | 'a';

/**
 * UpcomingEventsCard (F25 FR-17): card de Hoje com até 4 compromissos: dia, título, etiqueta, hora, local e chip de contagem (âmbar até amanhã).
 * Sem compromissos: texto e "Adicionar compromisso". `as` = 'a' ou o link do app.
 */
export type UpcomingEventsCardProps = {
  events: readonly CalendarEventItem[];
  labels: readonly CalendarLabelItem[];
  today: DayKey;
  timeZone: string;
  href: string;
  as?: LinkEl;
  text: { title: string; seeAll: string; allDay: string; count: (days: number) => string; empty: string; add: string };
};

export function UpcomingEventsCard({ events, labels, today, timeZone, href, as: As = 'a', text }: UpcomingEventsCardProps) {
  const list = events.slice(0, 4);
  return (
    <section aria-labelledby="cal-up" className="flex flex-col gap-1 rounded-[28px] border border-border bg-surface p-[22px]">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 id="cal-up" className="m-0 font-display text-[22px] font-bold text-ink">{text.title}</h2>
        {list.length ? <As href={href} className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary-deep">{text.seeAll}<Icon name="right" size={16} /></As> : null}
      </div>
      {list.map((e, i) => {
        const day = dayKeyOf(e.startsAt, timeZone);
        const n = diffDays(today, day);
        const label = labels.find((l) => l.id === e.labelId);
        const t = labelTone(label?.color ?? '#8F8AAE');
        return (
          <As key={e.id} href={href} className="slide flex min-h-11 items-center gap-3 border-t border-divider py-2.5 text-ink no-underline" >
            <span aria-hidden="true" className="flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-[13px] bg-soft leading-none"><b className="font-display text-[19px]">{parseKey(day).day}</b><span className="text-[10.5px] font-bold uppercase text-muted">{monthName(day).slice(0, 3)}</span></span>
            <span className="flex min-w-0 grow flex-col gap-0.5 leading-tight" style={{ animationDelay: `${i * 70}ms` }}>
              <span className="truncate text-[14.5px] font-bold">{e.title}</span>
              <span className="flex items-center gap-1.5 text-[12.5px] text-muted"><span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: t.dot }} /><span className="truncate">{label ? `${label.name} · ` : ''}{timeRange(e, timeZone, text.allDay)}{e.location ? ` · ${e.location}` : ''}</span></span>
            </span>
            <span className={`shrink-0 rounded-pill px-2.5 py-0.5 text-xs font-bold ${n <= 1 ? 'bg-watch-bg text-watch-text' : 'bg-chip text-primary-deep'}`}>{text.count(n)}</span>
          </As>
        );
      })}
      {list.length === 0 ? (
        <div className="flex flex-col items-start gap-2.5 border-t border-divider pb-2.5">
          <p className="m-0 pt-2.5 text-sm leading-normal text-muted">{text.empty}</p>
          <As href={href} className="inline-flex min-h-11 items-center gap-2 rounded-[13px] bg-primary-tint px-4 text-sm font-bold text-primary-deep no-underline"><Icon name="plus" size={18} />{text.add}</As>
        </div>
      ) : null}
    </section>
  );
}

/**
 * CalendarBanner (F25 FR-17): faixa âmbar "Amanhã às 08:00: título" + "etiqueta · local" que leva ao calendário; o ícone pulsa 2 s em laço.
 * Os textos já chegam montados (quem chama sabe se é hoje ou amanhã).
 */
export type CalendarBannerProps = { headline: string; detail?: string; cta: string; ariaLabel: string; href: string; as?: LinkEl };

export function CalendarBanner({ headline, detail, cta, ariaLabel, href, as: As = 'a' }: CalendarBannerProps) {
  return (
    <As href={href} aria-label={ariaLabel} className="lift slide flex min-h-11 items-center gap-4 rounded-[22px] border-[1.5px] border-[#FCD34D] bg-watch-bg px-5 py-3.5 text-ink no-underline">
      <span aria-hidden="true" className="cal-pulse flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-review-text"><Icon name="calendar" size={22} /></span>
      <span className="flex grow flex-col leading-tight"><span className="text-base font-extrabold">{headline}</span>{detail ? <span className="text-[13.5px] text-watch-text">{detail}</span> : null}</span>
      <span className="flex items-center gap-1.5 text-sm font-bold text-watch-text max-sm:hidden">{cta}<Icon name="right" size={16} /></span>
    </As>
  );
}
