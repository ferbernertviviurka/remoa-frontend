import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { strings, t } from '../../../strings/src/t-app';
import { Button } from '../button';
import { Dialog } from '../dialog';
import {
  CalendarMonthGrid, CalendarWeekGrid, CalendarAgendaList, EventGalleryCard, MiniCalendar, CalendarViewSwitch, LabelChip, LabelToggleRow, LabelColorPicker,
  EventForm, EventDetails, CalendarDrawer, CalendarTour, UpcomingEventsCard, CalendarBanner, CalendarEmptyState, CalendarSkeleton,
  type CalendarView, type EventFormValue,
} from './index';
import { NOW, TODAY, TZ, events, labels, manyOnOneDay, overlapping, text, tourDemo, tourSteps, tourText } from './fixtures';

/**
 * Calendário (F25). Referência: `docs/design/v2/screens/calendario-*.png` e `hoje-calendario.png` (1440 × 900).
 * Componentes apresentacionais: dados e callbacks por props; `today` (YYYY-MM-DD) e `timeZone` vêm do perfil, quem chama já resolveu o fuso.
 * Todo texto chega por props (aqui, de `@remoa/strings`, namespace `calendar`). Movimento reduzido: `data-motion="reduced"` na raiz mostra o quadro final.
 * Regra de uso: a grade do mês (`role="grid"`) é a visão principal; a Agenda é a alternativa em lista para quem não usa a grade (FR-20).
 * Modal de criar/editar: `Dialog size="form"` (600 px) com `EventForm`; gaveta de detalhes: `CalendarDrawer` (470 px) com `EventDetails`; tutorial: `CalendarTour` (usa `Dialog size="tour"`).
 */
const meta = { title: 'Calendário/Componentes', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type S = StoryObj<typeof meta>;
const noop = () => undefined;

export const Mes: S = { render: () => <CalendarMonthGrid year={2026} month={9} today={TODAY} timeZone={TZ} events={events} labels={labels} onDayClick={noop} onEventClick={noop} text={text.month} /> };

export const MesMaisDeTres: S = { render: () => <CalendarMonthGrid year={2026} month={9} today={TODAY} timeZone={TZ} events={manyOnOneDay} labels={labels} onDayClick={noop} onEventClick={noop} text={text.month} /> };

function Navegavel() {
  const [m, setM] = useState({ y: 2026, m: 9 });
  const step = (by: number) => setM((c) => { const t0 = c.y * 12 + c.m + by; return { y: Math.floor(t0 / 12), m: t0 % 12 }; });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => step(-1)}>{strings.calendar.prev}</Button><Button variant="secondary" size="sm" onClick={() => step(1)}>{strings.calendar.next}</Button></div>
      <CalendarMonthGrid year={m.y} month={m.m} today={TODAY} timeZone={TZ} events={events} labels={labels} onDayClick={noop} onEventClick={noop} text={text.month} />
    </div>
  );
}
export const MesNavegando: S = { render: () => <Navegavel /> };

export const Semana: S = { render: () => <CalendarWeekGrid anchor={TODAY} today={TODAY} now={NOW} timeZone={TZ} events={events} labels={labels} onEventClick={noop} text={text.week} /> };
export const SemanaSobreposicao: S = { render: () => <CalendarWeekGrid anchor={TODAY} today={TODAY} now={NOW} timeZone={TZ} events={overlapping} labels={labels} onEventClick={noop} text={text.week} /> };

export const Agenda: S = { render: () => <CalendarAgendaList today={TODAY} timeZone={TZ} events={events} labels={labels} onEventClick={noop} text={text.agenda} /> };

export const Galeria: S = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
      {events.slice(0, 6).map((e, i) => <EventGalleryCard key={e.id} event={i === 1 ? { ...e, coverUrl: undefined } : e} label={labels.find((l) => l.id === e.labelId)} today={TODAY} timeZone={TZ} delay={i * 55} onOpen={noop} text={{ allDay: text.week.allDay, count: text.count }} />)}
    </div>
  ),
};

function Mini() {
  const [v, setV] = useState({ y: 2026, m: 9 });
  const [sel, setSel] = useState(TODAY);
  return <div className="w-[300px]"><MiniCalendar year={v.y} month={v.m} today={TODAY} selected={sel} eventDays={['2026-10-06', '2026-10-08', '2026-10-19']} onMonthChange={(y, m) => setV({ y, m })} onSelectDay={setSel} text={text.mini} /></div>;
}
export const Mini_Calendario: S = { render: () => <Mini /> };

function Switch() {
  const [v, setV] = useState<CalendarView>('month');
  return <CalendarViewSwitch value={v} onChange={setV} text={text.views} />;
}
export const SeletorDeVisao: S = { render: () => <Switch /> };

function Etiquetas() {
  const [hidden, setHidden] = useState<string[]>([]);
  const [color, setColor] = useState('#2563EB');
  return (
    <div className="flex w-[300px] flex-col gap-4">
      <div className="flex flex-col">{labels.map((l, i) => <LabelToggleRow key={l.id} label={l} visible={!hidden.includes(l.id)} count={[3, 1, 1, 1, 2][i]!} onToggle={(v) => setHidden((h) => (v ? h.filter((x) => x !== l.id) : [...h, l.id]))} text={{ show: text.labelShow }} />)}</div>
      <div className="flex flex-wrap gap-2">{labels.map((l) => <LabelChip key={l.id} label={l} />)}</div>
      <LabelColorPicker value={color} onChange={setColor} text={text.colors} />
    </div>
  );
}
export const Etiquetas_: S = { name: 'Etiquetas', render: () => <Etiquetas /> };

const blank: EventFormValue = { title: '', labelId: 'prova', date: '2026-10-07', allDay: false, start: '08:00', end: '09:00', location: '', description: '', cover: null, remindD1: true, remindD0: true };
function Form({ start = blank, mode = 'create' as const }: { start?: EventFormValue; mode?: 'create' | 'edit' }) {
  const [open, setOpen] = useState(true);
  const [v, setV] = useState(start);
  return (
    <>
      <Button onClick={() => setOpen(true)}>{strings.calendar.newEvent}</Button>
      <Dialog open={open} onOpenChange={setOpen} title={mode === 'edit' ? text.form.titleEdit : text.form.titleNew} closeLabel={text.form.close} size="form" srOnlyHeader>
        <EventForm mode={mode} value={v} onChange={setV} labels={labels} onSubmit={() => setOpen(false)} onCancel={() => setOpen(false)} onFile={(f) => setV((c) => ({ ...c, cover: { name: f.name, url: URL.createObjectURL(f) } }))} text={text.form} />
      </Dialog>
    </>
  );
}
/** "Salvar compromisso" só ativa com título (2–120) e data. */
export const FormularioNovo: S = { render: () => <Form /> };
export const FormularioEditar: S = { render: () => <Form mode="edit" start={{ ...blank, title: 'Prova de Cirurgia', location: 'Sala 101 · Bloco A', start: '14:00', end: '16:00' }} /> };

function Details({ withImage }: { withImage?: boolean }) {
  const [open, setOpen] = useState(true);
  const [r, setR] = useState({ d1: true, d0: true });
  const e = { ...events[1]!, coverUrl: withImage ? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="470" height="200"><rect width="470" height="200" fill="%23FDBA74"/></svg>' : null };
  return (
    <>
      <Button onClick={() => setOpen(true)}>{text.details.drawerTitle}</Button>
      <CalendarDrawer open={open} onOpenChange={setOpen} title={text.details.drawerTitle}>
        <EventDetails event={e} label={labels[0]} today={TODAY} timeZone={TZ} onClose={() => setOpen(false)} onEdit={noop} onDuplicate={noop} onDelete={() => setOpen(false)} onToggleReminder={(id, on) => setR((c) => ({ ...c, [id]: on }))}
          reminders={[{ id: 'd1', title: strings.calendar.form.d1, detail: 'Hoje, às 18:00', on: r.d1 }, { id: 'd0', title: strings.calendar.form.d0, detail: 'No dia, às 07:00', on: r.d0 }]}
          text={{ ...text.details, when: text.when }} />
      </CalendarDrawer>
    </>
  );
}
export const Detalhes: S = { render: () => <Details /> };
export const DetalhesComCapa: S = { render: () => <Details withImage /> };

function Tour() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>{strings.calendar.howItWorks}</Button>
      <CalendarTour open={open} onClose={() => setOpen(false)} steps={tourSteps} demo={tourDemo} text={tourText} />
    </>
  );
}
/** Cinco passos, cada um com a própria ilustração animada; setas e Esc funcionam. */
export const Tutorial: S = { render: () => <Tour /> };

export const ProximosCompromissos: S = {
  render: () => (
    <div className="flex max-w-[520px] flex-col gap-4">
      <CalendarBanner headline={t('calendar.banner.headline', { when: t('calendar.banner.tomorrowAt', { time: '08:00' }), title: events[1]!.title })} detail={`${labels[0]!.name} · ${events[1]!.location}`} cta={strings.calendar.banner.cta} ariaLabel={strings.calendar.banner.ariaLabel} href="/calendario" />
      <UpcomingEventsCard events={events} labels={labels} today={TODAY} timeZone={TZ} href="/calendario" text={{ ...text.upcoming, count: text.count }} />
      <UpcomingEventsCard events={[]} labels={labels} today={TODAY} timeZone={TZ} href="/calendario" text={{ ...text.upcoming, count: text.count }} />
    </div>
  ),
};

export const Vazio: S = {
  render: () => (
    <div className="flex flex-col gap-4">
      <CalendarEmptyState title={strings.calendar.states.emptyTitle} body={strings.calendar.states.emptyBody} cta={strings.calendar.states.emptyCta} onAdd={noop} />
      <CalendarMonthGrid year={2026} month={9} today={TODAY} timeZone={TZ} events={[]} labels={labels} onDayClick={noop} onEventClick={noop} text={text.month} />
    </div>
  ),
};

export const Carregando: S = {
  render: () => <div className="flex flex-col gap-6">{(['month', 'week', 'agenda', 'gallery'] as const).map((v) => <CalendarSkeleton key={v} view={v} label={strings.calendar.states.loading} />)}</div>,
};
