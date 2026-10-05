'use client';

import { useState, type ReactNode } from 'react';
import * as RD from '@radix-ui/react-dialog';
import { Button } from '../button';
import { Icon } from '../icons';
import { Switch } from '../switch';
import { dayKeyOf, diffDays, longDate, timeRange } from './dates';
import { labelTone } from './palette';
import type { CalendarEventItem, CalendarLabelItem, DayKey } from './types';

/**
 * CalendarDrawer: casca da gaveta de detalhes (470 px, entra pela direita em 450 ms, foco preso e devolvido, Esc fecha).
 * Dialog do Radix; `title` só para leitor de tela (o conteúdo traz o título visível).
 */
export function CalendarDrawer({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: ReactNode }) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="remoa-overlay fixed inset-0 z-50 bg-[rgba(26,21,51,.45)]" />
        <RD.Content aria-describedby={undefined} className="drawer-in fixed inset-y-0 right-0 z-50 flex w-[min(100vw,470px)] flex-col overflow-y-auto bg-surface text-text shadow-lift outline-none">
          <RD.Title className="sr-only">{title}</RD.Title>
          {children}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

/**
 * EventDetails (F25 FR-12): conteúdo da gaveta: capa, etiqueta, título, data por extenso com "hoje/amanhã/em N dias", local, descrição,
 * avisos (cada um com o horário de envio, em switch) e Editar, Duplicar, Excluir (com confirmação inline que avisa que os avisos agendados serão cancelados).
 * Os textos de horário dos avisos (`reminders[].detail`) chegam resolvidos no fuso do perfil.
 */
export type EventDetailsProps = {
  event: CalendarEventItem;
  label?: CalendarLabelItem;
  today: DayKey;
  timeZone: string;
  reminders: ReadonlyArray<{ id: string; title: string; detail: string; on: boolean; disabled?: boolean }>;
  onToggleReminder: (id: string, on: boolean) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
  /** FR-18: baixa o .ics. Sem ele, o botão não aparece. */
  onAddToCalendar?: () => void;
  text: {
    addToCalendar?: string;
    close: string; allDay: string; when: (days: number) => string; remindersTitle: string;
    edit: string; duplicate: string; delete: string;
    confirmTitle: string; confirmBody: string; confirmYes: string; confirmNo: string;
  };
};

export function EventDetails({ event, label, today, timeZone, reminders, onToggleReminder, onEdit, onDuplicate, onDelete, onClose, onAddToCalendar, text }: EventDetailsProps) {
  const [confirm, setConfirm] = useState(false);
  const t = labelTone(label?.color ?? '#8F8AAE');
  const day = dayKeyOf(event.startsAt, timeZone);
  const row = 'flex items-start gap-3 text-ink';
  return (
    <div className="flex flex-col">
      <div className="relative flex h-[200px] shrink-0 items-end bg-cover bg-center p-4" style={event.coverUrl ? { backgroundImage: `url("${event.coverUrl}")` } : { background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}>
        <button type="button" aria-label={text.close} onClick={onClose} className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-[14px] bg-surface text-ink focus-visible:outline-2 focus-visible:outline-primary"><Icon name="close" size={18} /></button>
        {label ? <span className="rounded-pill bg-surface px-3 py-1 text-xs font-bold" style={{ color: t.text }}>{label.name}</span> : null}
      </div>
      <div className="flex flex-col gap-4 p-6">
        <h2 className="font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-ink">{event.title}</h2>
        <div className={row}>
          <span className="mt-0.5 text-muted"><Icon name="clock" size={20} /></span>
          <span className="flex flex-col leading-snug">
            <span className="font-bold">{longDate(day)}</span>
            <span className="text-muted">{timeRange(event, timeZone, text.allDay)} · {text.when(diffDays(today, day))}</span>
          </span>
        </div>
        {event.location ? <div className={row}><span className="mt-0.5 text-muted"><Icon name="link" size={20} /></span><span className="font-bold">{event.location}</span></div> : null}
        {event.description ? <div className={row}><span className="mt-0.5 text-muted"><Icon name="pencil" size={20} /></span><p className="m-0 whitespace-pre-line leading-relaxed text-ink-2">{event.description}</p></div> : null}
        <div className="flex flex-col rounded-[20px] bg-soft px-4 py-1.5">
          <span className="pb-1 pt-2.5 text-xs font-bold uppercase tracking-[0.12em] text-muted">{text.remindersTitle}</span>
          {reminders.map((r) => (
            <div key={r.id} className="flex min-h-[58px] items-center gap-3 border-t border-border">
              <span className="flex grow flex-col leading-tight"><span className="font-bold text-ink">{r.title}</span><span className="text-[13px] text-muted">{r.detail}</span></span>
              <Switch size="lg" label={r.title} hideLabel checked={r.on} disabled={r.disabled} onCheckedChange={(c) => onToggleReminder(r.id, c)} />
            </div>
          ))}
        </div>
        {confirm ? (
          <div role="alertdialog" aria-labelledby="ev-del-t" aria-describedby="ev-del-b" className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-review bg-review-bg p-4">
            <span id="ev-del-t" className="font-bold text-review-text">{text.confirmTitle}</span>
            <span id="ev-del-b" className="text-sm text-review-text">{text.confirmBody}</span>
            <div className="flex gap-2.5"><Button variant="danger" size="sm" onClick={onDelete}>{text.confirmYes}</Button><Button variant="secondary" size="sm" onClick={() => setConfirm(false)}>{text.confirmNo}</Button></div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            <Button size="sm" icon={<Icon name="pencil" size={18} />} onClick={onEdit}>{text.edit}</Button>
            <Button size="sm" variant="secondary" icon={<Icon name="copy" size={18} />} onClick={onDuplicate}>{text.duplicate}</Button>
            <Button size="sm" variant="quiet" icon={<Icon name="trash" size={18} />} onClick={() => setConfirm(true)}>{text.delete}</Button>
            {onAddToCalendar && text.addToCalendar ? <Button size="sm" variant="secondary" icon={<Icon name="calendar" size={18} />} onClick={onAddToCalendar}>{text.addToCalendar}</Button> : null}
          </div>
        )}
      </div>
    </div>
  );
}
