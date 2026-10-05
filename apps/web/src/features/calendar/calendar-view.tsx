'use client';

import { useEffect, useRef, useState } from 'react';
import type { CalendarLabel, CalendarSettings } from '@remoa/contracts';
import { strings, t } from '@remoa/strings';
import {
  Button, CalendarAgendaList, CalendarEmptyState, CalendarMonthGrid, CalendarSkeleton, CalendarTour, CalendarViewSwitch, CalendarWeekGrid, EventGalleryCard, Icon, IconButton,
  LabelToggleRow, MiniCalendar, makeKey, monthTitle, parseKey, weekTitle, type CalendarTourCloseHow, type DayKey,
} from '@remoa/ui';
import { track } from '@/lib/analytics';
import { calendarApi, downloadIcs } from './api';
import { EventDrawer } from './event-drawer';
import { EventModal } from './event-modal';
import { LabelDialog } from './label-dialog';
import { emptyForm, formFromEv, toItem, toLabelItem } from './model';
import { text, tourDemo, tourSteps, tourText } from './text';
import { useCalendar } from './use-calendar';

type Modal = { mode: 'create'; date: DayKey } | { mode: 'edit'; id: string } | null;

const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/** F25 /app/calendario: lateral de 300 px, barra, as quatro visões, modal, gaveta, etiquetas e o tutorial da primeira abertura. */
export function CalendarView({ settings, labels: initialLabels, nowIso }: { settings: CalendarSettings; labels: CalendarLabel[]; nowIso: string }) {
  const cal = useCalendar({ settings, labels: initialLabels, nowIso });
  const { today, tz, view, anchor } = cal;
  const [modal, setModal] = useState<Modal>(null);
  const [labelDlg, setLabelDlg] = useState<{ label: CalendarLabel | null } | null>(null);
  const [tour, setTour] = useState<{ cta: boolean } | null>(settings.tourSeenAt === null ? { cta: true } : null);
  const seen = useRef(settings.tourSeenAt !== null);

  const items = cal.labels.map(toLabelItem);
  const labelOf = (id: string) => items.find((l) => l.id === id);
  const personal = cal.labels.find((l) => l.systemKey === 'personal') ?? cal.labels[0];
  const openNew = (date: DayKey = today) => setModal({ mode: 'create', date });
  const p = parseKey(anchor);
  const visibleItems = cal.visible.map(toItem);
  const eventDays = [...new Set(cal.events.map((e) => e.date))];

  // `N` opens a new event (not while typing or with a dialog open)
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      setModal({ mode: 'create', date: today });
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [today]);

  const closeTour = (how: CalendarTourCloseHow) => {
    const first = !seen.current;
    setTour(null);
    if (first) {
      seen.current = true;
      void calendarApi.tourSeen().catch(() => {});
    }
    track('calendar_tour_finished', { how: how === 'esc' ? 'skip' : how });
    if (how === 'create') openNew();
  };

  const title =
    view === 'month' ? monthTitle(p.year, p.month) : view === 'week' ? weekTitle(anchor) : view === 'agenda' ? strings.calendar.agendaTitle : strings.calendar.galleryTitle;
  const arrows = view === 'month' || view === 'week';
  const editing = modal?.mode === 'edit' ? cal.events.find((e) => e.id === modal.id) : undefined;
  const gallery = cal.visible.filter((e) => e.date >= today).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const empty = cal.status === 'ready' && cal.events.length === 0;

  return (
    <div className="-m-4 flex min-h-[calc(100dvh-65px)] md:-m-6">
      <aside aria-label={strings.calendar.navLabel} className="flex w-[300px] shrink-0 flex-col gap-5 border-r border-border bg-surface p-5 max-lg:hidden">
        <div className="grid">
          <Button size="cta" icon={<Icon name="plus" size={20} />} onClick={() => openNew()}>{strings.calendar.newEvent}</Button>
        </div>
        <MiniCalendar
          year={p.year}
          month={p.month}
          today={today}
          selected={anchor}
          eventDays={eventDays}
          onSelectDay={cal.setAnchor}
          onMonthChange={(y, m) => cal.setAnchor((a) => (parseKey(a).year === y && parseKey(a).month === m ? a : makeKey(y, m, 1)))}
          text={text.mini}
        />
        <section aria-labelledby="cal-labels" className="flex flex-col gap-1">
          <h2 id="cal-labels" className="m-0 pb-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">{strings.calendar.labelsTitle}</h2>
          {cal.labels.map((l) => (
            <div key={l.id} className="flex items-center">
              <div className="min-w-0 grow">
                <LabelToggleRow label={toLabelItem(l)} visible={!l.hidden} count={l.eventCount} onToggle={(v) => cal.toggleLabel(l.id, v)} text={{ show: text.labelShow }} />
              </div>
              <IconButton aria-label={t('calendar.page.editLabel', { name: l.name })} size="md" onClick={() => setLabelDlg({ label: l })}><Icon name="pencil" size={16} /></IconButton>
            </div>
          ))}
          <Button variant="quiet" size="sm" align="start" icon={<Icon name="plus" size={18} />} onClick={() => setLabelDlg({ label: null })}>{strings.calendar.newLabel}</Button>
        </section>
        <Button variant="quiet" size="sm" align="start" icon={<Icon name="help" size={18} />} onClick={() => setTour({ cta: false })}>{strings.calendar.howItWorks}</Button>
      </aside>

      <section className="flex min-w-0 grow flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={cal.goToday}>{strings.calendar.today}</Button>
          {arrows ? (
            <>
              <IconButton aria-label={strings.calendar.prev} variant="quiet" onClick={() => cal.step(-1)}><Icon name="left" size={20} /></IconButton>
              <IconButton aria-label={strings.calendar.next} variant="quiet" onClick={() => cal.step(1)}><Icon name="right" size={20} /></IconButton>
            </>
          ) : null}
          <h1 aria-live="polite" className="m-0 grow font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-ink md:text-[34px]">{title}</h1>
          <CalendarViewSwitch value={view} onChange={cal.setView} text={text.views} />
        </div>

        {cal.failed ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-[16px] bg-review-bg px-4 py-3 text-review-text">
            <span className="grow text-sm font-semibold">{cal.failed.message}</span>
            <Button size="sm" onClick={cal.failed.retry}>{strings.calendar.page.retry}</Button>
            <Button size="sm" variant="quiet" onClick={cal.dismissFailed}>{strings.calendar.page.dismiss}</Button>
          </div>
        ) : null}
        {cal.queued > 0 ? <p role="status" className="m-0 rounded-[16px] bg-watch-bg px-4 py-3 text-sm font-semibold text-watch-text">{strings.calendar.page.offline}</p> : null}

        {cal.status === 'error' ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-list border border-border bg-surface p-6">
            <span className="grow font-bold">{strings.calendar.page.loadError}</span>
            <Button onClick={cal.refetch}>{strings.calendar.page.retry}</Button>
          </div>
        ) : cal.status === 'loading' && cal.events.length === 0 ? (
          <CalendarSkeleton view={view} label={strings.calendar.states.loading} />
        ) : (
          <>
            {empty ? <CalendarEmptyState title={strings.calendar.states.emptyTitle} body={strings.calendar.states.emptyBody} cta={strings.calendar.states.emptyCta} onAdd={() => openNew()} /> : null}
            {view === 'month' ? (
              <CalendarMonthGrid year={p.year} month={p.month} today={today} timeZone={tz} events={visibleItems} labels={items} onDayClick={openNew} onEventClick={cal.select} text={text.month} />
            ) : view === 'week' ? (
              <CalendarWeekGrid anchor={anchor} today={today} now={cal.now} timeZone={tz} events={visibleItems} labels={items} onEventClick={cal.select} text={text.week} />
            ) : view === 'agenda' ? (
              <CalendarAgendaList today={today} timeZone={tz} events={visibleItems} labels={items} onEventClick={cal.select} text={text.agenda} />
            ) : (
              <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
                {gallery.map((e, i) => (
                  <EventGalleryCard key={e.id} event={toItem(e)} label={labelOf(e.labelId)} today={today} timeZone={tz} delay={i * 55} onOpen={cal.select} text={text.gallery} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <div className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-4 z-30 lg:hidden">
        <IconButton aria-label={strings.calendar.newEvent} variant="primary" size="lg" onClick={() => openNew()}><Icon name="plus" size={24} /></IconButton>
      </div>

      <EventDrawer
        event={modal ? null : cal.selectedEv}
        label={cal.selectedEv ? labelOf(cal.selectedEv.labelId) : undefined}
        today={today}
        tz={tz}
        onClose={() => cal.select(null)}
        onEdit={() => cal.selectedEv && !cal.selectedEv.pending && setModal({ mode: 'edit', id: cal.selectedEv.id })}
        onDuplicate={() => cal.selectedEv && cal.duplicate(cal.selectedEv.id)}
        onDelete={() => cal.selectedEv && cal.remove(cal.selectedEv.id)}
        onToggleReminder={(kind, on) => cal.selectedEv && cal.setReminder(cal.selectedEv.id, kind, on)}
        onAddToCalendar={() => cal.selectedEv && !cal.selectedEv.pending && void downloadIcs(cal.selectedEv.id)}
      />

      {modal?.mode === 'create' && personal ? (
        <EventModal mode="create" initial={emptyForm(modal.date, personal.id)} labels={items} onClose={() => setModal(null)} onSubmit={(v, cover) => { setModal(null); cal.create(v, cover); }} />
      ) : null}
      {modal?.mode === 'edit' && editing ? (
        <EventModal mode="edit" initial={formFromEv(editing)} initialCoverId={editing.coverAssetId} labels={items} onClose={() => setModal(null)} onSubmit={(v, cover) => { setModal(null); cal.update(editing.id, v, cover); }} />
      ) : null}
      {labelDlg ? (
        <LabelDialog
          label={labelDlg.label}
          onClose={() => setLabelDlg(null)}
          onSave={(input) => cal.saveLabel(labelDlg.label?.id ?? null, input)}
          onDelete={labelDlg.label && labelDlg.label.systemKey !== 'personal' ? () => cal.deleteLabel(labelDlg.label!.id) : null}
        />
      ) : null}
      <CalendarTour open={!!tour} onClose={closeTour} onStep={(n) => track('calendar_tour_step', { step: n })} createCta={tour?.cta ?? false} steps={tourSteps} demo={tourDemo} text={tourText} />
    </div>
  );
}
