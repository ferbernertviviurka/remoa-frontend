import { strings, t } from '../../../strings/src/t-app'; // namespace calendar inteiro (fora do núcleo, P-512)
import { DEFAULT_LABEL_COLORS } from './palette';
import { addDays } from './dates';
import type { CalendarEventItem, CalendarLabelItem } from './types';
import type { CalendarTourDemo } from './tour';

/** Dados de exemplo (stories e testes). "Hoje" é 5 de outubro de 2026, fuso de São Paulo (UTC−3, sem horário de verão). */
export const TZ = 'America/Sao_Paulo';
export const TODAY = '2026-10-05';
export const NOW = new Date('2026-10-05T14:00:00-03:00');

const d = strings.calendar.labels.defaults;
export const labels: CalendarLabelItem[] = [
  { id: 'prova', name: d.prova, color: DEFAULT_LABEL_COLORS.prova },
  { id: 'trabalho', name: d.trabalho, color: DEFAULT_LABEL_COLORS.trabalho },
  { id: 'importante', name: d.importante, color: DEFAULT_LABEL_COLORS.importante },
  { id: 'plantao', name: d.plantao, color: DEFAULT_LABEL_COLORS.plantao },
  { id: 'pessoal', name: d.pessoal, color: DEFAULT_LABEL_COLORS.pessoal },
];

const at = (off: number, hhmm: string) => new Date(`${addDays(TODAY, off)}T${hhmm}:00-03:00`).toISOString();
const ev = (id: string, title: string, labelId: string, off: number, start: string | null, end: string | null, location: string, extra: Partial<CalendarEventItem> = {}): CalendarEventItem => ({
  id, title, labelId, startsAt: at(off, start ?? '00:00'), endsAt: end ? at(off, end) : null, allDay: start === null, location, description: null, coverUrl: null, ...extra,
});

export const events: CalendarEventItem[] = [
  ev('e0', 'Grupo de estudo', 'pessoal', 0, '19:00', '21:00', 'Biblioteca central'),
  ev('e1', 'Prova de Clínica Médica', 'prova', 1, '08:00', '10:00', 'Sala 204 · Bloco B', { description: 'Capítulos 1 a 6: sepse, insuficiência cardíaca e pneumonia. Levar documento com foto.' }),
  ev('e2', 'Entrega do trabalho de Epidemiologia', 'trabalho', 3, '23:59', null, 'Plataforma da faculdade'),
  ev('e3', 'Prazo da inscrição da residência', 'importante', 5, null, null, 'Site da banca'),
  ev('e4', 'Plantão no pronto-socorro', 'plantao', 6, '19:00', '23:00', 'Hospital universitário'),
  ev('e5', 'Simulado Enamed', 'prova', 9, '09:00', '13:00', 'Online'),
  ev('e6', 'Aniversário da mãe', 'pessoal', 11, null, null, ''),
  ev('e7', 'Prova de Cirurgia', 'prova', 14, '14:00', '16:00', 'Sala 101 · Bloco A'),
];
export const manyOnOneDay: CalendarEventItem[] = ['08:00', '09:00', '10:00', '11:00', '12:00'].map((h, i) => ev(`m${i}`, `Compromisso ${i + 1}`, 'prova', 1, h, null, ''));
export const overlapping: CalendarEventItem[] = [
  ev('o1', 'Aula de Clínica', 'prova', 1, '09:00', '11:00', ''),
  ev('o2', 'Monitoria', 'plantao', 1, '10:00', '12:00', ''),
  ev('o3', 'Reunião do grupo', 'pessoal', 1, '10:30', '11:30', ''),
];

const rel = strings.calendar.relative;
export const text = {
  views: strings.calendar.views,
  month: {
    gridLabel: strings.calendar.month.gridLabel,
    allDay: strings.calendar.month.allDay,
    count: (n: number) => t('calendar.month.count', { n }),
    more: (n: number) => t('calendar.month.more', { n }),
  },
  week: strings.calendar.week,
  agenda: strings.calendar.agenda,
  count: (days: number) => (days < 0 ? rel.past : days === 0 ? rel.today : days === 1 ? rel.tomorrow : t('calendar.relative.inDays', { n: days })),
  when: (days: number) => (days < 0 ? rel.pastLower : days === 0 ? rel.todayLower : days === 1 ? rel.tomorrowLower : t('calendar.relative.inDaysLower', { n: days })),
  mini: strings.calendar.mini,
  labelShow: (name: string) => t('calendar.labels.show', { name }),
  colors: { label: strings.calendar.labels.colorPicker, names: strings.calendar.labels.colors as Record<string, string> },
  form: { ...strings.calendar.form, coverText: strings.calendar.form.coverText },
  details: strings.calendar.details,
  upcoming: strings.calendar.upcoming,
};

export const tourDemo: CalendarTourDemo = (() => {
  const x = strings.calendar.tour.demo;
  return {
    coverChip: x.coverChip, label: x.label, eventTitle: x.eventTitle, when: x.when, place: x.place, notes: x.notes,
    labels: [x.l1, x.l2, x.l3, x.l4], rows: [x.r1, x.r2, x.r3],
    d1: x.d1, d1At: x.d1At, d0: x.d0, d0At: x.d0At, bell: x.bell, upcoming: x.upcoming,
    items: [{ ...x.i1, urgent: true }, { ...x.i2, urgent: false }, { ...x.i3, urgent: false }],
  };
})();
export const tourSteps: readonly { title: string; body: string }[] = Object.values(strings.calendar.tour.steps);
export const tourText = {
  dialog: strings.calendar.tour.dialog,
  eyebrow: (step: number, total: number) => t('calendar.tour.eyebrow', { step, total }),
  skip: strings.calendar.tour.skip, back: strings.calendar.tour.back, next: strings.calendar.tour.next, create: strings.calendar.tour.create, done: strings.calendar.tour.done,
};
