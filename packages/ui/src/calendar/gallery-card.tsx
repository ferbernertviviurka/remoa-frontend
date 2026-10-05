'use client';

import { Icon } from '../icons';
import { dayKeyOf, diffDays, shortDate, timeRange } from './dates';
import { labelTone } from './palette';
import type { CalendarEventItem, CalendarLabelItem, DayKey } from './types';

/**
 * EventGalleryCard (F25 FR-7): capa (imagem ou degradê da etiqueta), etiqueta, chip de contagem ("Hoje" / "Amanhã" / "Em N dias", âmbar até amanhã),
 * título, data e hora, local. Elevação (`lift`) ao passar o mouse. O cartão todo é um botão. `delay` (ms) para a cascata de 55 ms.
 */
export type EventGalleryCardProps = {
  event: CalendarEventItem;
  label?: CalendarLabelItem;
  today: DayKey;
  timeZone: string;
  onOpen: (id: string) => void;
  delay?: number;
  text: { allDay: string; count: (days: number) => string };
};

export function EventGalleryCard({ event, label, today, timeZone, onOpen, delay = 0, text }: EventGalleryCardProps) {
  const t = labelTone(label?.color ?? '#8F8AAE');
  const day = dayKeyOf(event.startsAt, timeZone);
  const days = diffDays(today, day);
  const soon = days <= 1;
  return (
    <button type="button" onClick={() => onOpen(event.id)} className="lift slide flex min-h-[276px] flex-col overflow-hidden rounded-list border border-border bg-surface text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" style={{ animationDelay: `${delay}ms` }}>
      <span
        className="relative flex h-[140px] w-full shrink-0 items-end justify-between gap-2 bg-cover bg-center p-3"
        style={event.coverUrl ? { backgroundImage: `url("${event.coverUrl}")` } : { background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
      >
        {label ? <span className="rounded-pill bg-surface/90 px-2.5 py-0.5 text-xs font-bold" style={{ color: t.text }}>{label.name}</span> : <span />}
        <span className={`rounded-pill px-2.5 py-0.5 text-xs font-bold ${soon ? 'bg-watch-bg text-watch-text' : 'bg-surface/90 text-primary-deep'}`}>{text.count(days)}</span>
      </span>
      <span className="flex flex-col gap-2 p-4">
        <span className="font-display text-xl font-bold leading-tight tracking-[-0.02em] text-ink">{event.title}</span>
        <span className="flex items-center gap-2 text-sm text-muted"><Icon name="clock" size={16} />{shortDate(day)} · {timeRange(event, timeZone, text.allDay)}</span>
        {event.location ? <span className="flex items-center gap-2 text-sm text-muted"><Icon name="link" size={16} />{event.location}</span> : null}
      </span>
    </button>
  );
}
