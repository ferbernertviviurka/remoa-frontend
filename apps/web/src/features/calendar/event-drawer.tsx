'use client';

import type { CalendarReminderKind } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { CalendarDrawer, EventDetails, dayKeyOf, shortDate, timeOf, type CalendarLabelItem, type DayKey } from '@remoa/ui';
import { reminderLocal, toItem, type Ev } from './model';
import { text } from './text';

const t = withStrings({ calendar: more.calendar }); // P-512: namespace fora do núcleo

/** Linha de aviso: o horário vem do `ReminderPlan` da API; sem plano (aviso desligado ou ainda não planejado), da regra 18:00 / 07:00 / 1 h antes. */
function reminderRow(e: Ev, kind: CalendarReminderKind, tz: string) {
  const plan = e.reminders.find((r) => r.kind === kind);
  const local = reminderLocal(kind, e.date, e.startTime);
  const date = plan ? dayKeyOf(plan.sendAt, tz) : local.date;
  const time = plan ? timeOf(plan.sendAt, tz) : local.time;
  const on = kind === 'd1' ? e.remindD1 : e.remindD0;
  const key = on && plan?.status === 'sent' ? 'reminderSent' : on && plan?.status === 'skipped' ? 'reminderSkipped' : 'reminderAt';
  return { id: kind, title: kind === 'd1' ? text.form.d1 : text.form.d0, detail: t(`calendar.page.${key}`, { date: shortDate(date), time }), on, disabled: !!e.pending };
}

/** F25 FR-12: gaveta de 470 px com os detalhes, os avisos com horário real, Editar, Duplicar, Excluir e o .ics. */
export function EventDrawer({ event, label, today, tz, onClose, onEdit, onDuplicate, onDelete, onToggleReminder, onAddToCalendar }: {
  event: Ev | null;
  label?: CalendarLabelItem;
  today: DayKey;
  tz: string;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleReminder: (kind: CalendarReminderKind, on: boolean) => void;
  onAddToCalendar: () => void;
}) {
  return (
    <CalendarDrawer open={!!event} onOpenChange={(o) => { if (!o) onClose(); }} title={text.details.drawerTitle}>
      {event ? (
        <EventDetails
          event={toItem(event)}
          label={label}
          today={today}
          timeZone={tz}
          reminders={[reminderRow(event, 'd1', tz), reminderRow(event, 'd0', tz)]}
          onToggleReminder={(id, on) => onToggleReminder(id as CalendarReminderKind, on)}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onClose={onClose}
          onAddToCalendar={onAddToCalendar}
          text={text.details}
        />
      ) : null}
    </CalendarDrawer>
  );
}
