// F25: the ui components take their text by props; this builds them from `strings.calendar` (functions cannot cross the server boundary, so import from client modules only).
import { strings, t } from '@remoa/strings';
import type { CalendarTourDemo } from '@remoa/ui';

const c = strings.calendar;
const rel = c.relative;

/** "Hoje" / "Amanhã" / "Em N dias" chip. */
export const count = (days: number) => (days < 0 ? rel.past : days === 0 ? rel.today : days === 1 ? rel.tomorrow : t('calendar.relative.inDays', { n: days }));
/** "hoje" / "amanhã" / "em N dias" inside a sentence. */
export const when = (days: number) => (days < 0 ? rel.pastLower : days === 0 ? rel.todayLower : days === 1 ? rel.tomorrowLower : t('calendar.relative.inDaysLower', { n: days }));

export const text = {
  views: c.views,
  month: { gridLabel: c.month.gridLabel, allDay: c.month.allDay, count: (n: number) => t('calendar.month.count', { n }), more: (n: number) => t('calendar.month.more', { n }) },
  week: c.week,
  agenda: c.agenda,
  gallery: { allDay: c.gallery.allDay, count },
  mini: c.mini,
  labelShow: (name: string) => t('calendar.labels.show', { name }),
  colors: { label: c.labels.colorPicker, names: c.labels.colors as Record<string, string> },
  form: { ...c.form },
  details: { ...c.details, when },
  upcoming: { ...c.upcoming, count },
};

export const tourDemo: CalendarTourDemo = (() => {
  const x = c.tour.demo;
  return {
    coverChip: x.coverChip, label: x.label, eventTitle: x.eventTitle, when: x.when, place: x.place, notes: x.notes,
    labels: [x.l1, x.l2, x.l3, x.l4], rows: [x.r1, x.r2, x.r3],
    d1: x.d1, d1At: x.d1At, d0: x.d0, d0At: x.d0At, bell: x.bell, upcoming: x.upcoming,
    items: [{ ...x.i1, urgent: true }, { ...x.i2, urgent: false }, { ...x.i3, urgent: false }],
  };
})();
export const tourSteps: readonly { title: string; body: string }[] = Object.values(c.tour.steps);
export const tourText = {
  dialog: c.tour.dialog,
  eyebrow: (step: number, total: number) => t('calendar.tour.eyebrow', { step, total }),
  skip: c.tour.skip, back: c.tour.back, next: c.tour.next, create: c.tour.create, done: c.tour.done,
};
