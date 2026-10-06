'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CalendarLabel, CalendarSettings, CalendarView, CalendarReminderKind, Result } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { addDays, dayKeyOf, makeKey, parseKey, shortDate, type DayKey, type EventFormValue } from '@remoa/ui';
import { useToast } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { calendarApi } from './api';
import { covers, formFromEv, inputFromForm, labelKind, optimisticEv, rangeFor, toEv, type Ev } from './model';

const t = withStrings({ calendar: more.calendar }); // P-512: namespace fora do núcleo

type Range = { from: DayKey; to: DayKey };
export type Failure = { message: string; retry: () => void };
export type LabelOutcome = 'ok' | 'limit' | 'error';

/**
 * The state behind /app/calendario: events of the loaded range (visible ± 1 month, FR-22), labels, optimistic writes (FR-22) and the
 * offline queue (FR-19: a network failure keeps the optimistic row and replays when the browser is back online).
 */
export function useCalendar(init: { settings: CalendarSettings; labels: CalendarLabel[]; nowIso: string }) {
  const { toast } = useToast();
  const tz = init.settings.timezone;
  const [now, setNow] = useState(() => new Date(init.nowIso));
  const today = dayKeyOf(now, tz);
  const [view, setViewState] = useState<CalendarView>(init.settings.view ?? 'month');
  const [anchor, setAnchor] = useState<DayKey>(today);
  const [labels, setLabels] = useState(init.labels);
  const [events, setEvents] = useState<Ev[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reload, setReload] = useState(0);
  const [failed, setFailed] = useState<Failure | null>(null);
  const [queued, setQueued] = useState(0);
  const loaded = useRef<Range | null>(null);
  const evRef = useRef(events);
  evRef.current = events;
  const labelsRef = useRef(labels);
  labelsRef.current = labels;
  const queue = useRef<Array<() => Promise<void>>>([]);
  const seq = useRef(0);

  // clock: the "now" line and "today" follow the profile timezone
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // the default view (FR-3) is already resolved by the server page, so there is no swap after hydration
  useEffect(() => {
    track('calendar_opened', { view: init.settings.view ?? 'month' });
  }, [init.settings.view]);

  // load only what is visible ± 1 month
  useEffect(() => {
    const need = rangeFor(view, anchor, today);
    if (covers(loaded.current, need)) return;
    let live = true;
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    calendarApi
      .events(need.from, need.to)
      .then((r) => {
        if (!live) return;
        if (!r.ok) return setStatus('error');
        loaded.current = need;
        const fresh = r.data.events.map(toEv);
        setEvents((prev) => [...fresh, ...prev.filter((e) => e.pending && !fresh.some((f) => f.id === e.id))]);
        setStatus('ready');
      })
      .catch(() => live && setStatus('error'));
    return () => {
      live = false;
    };
  }, [view, anchor, today, reload]);

  const refetch = useCallback(() => {
    loaded.current = null;
    setStatus('loading');
    setReload((n) => n + 1);
  }, []);
  const refreshLabels = useCallback(() => void calendarApi.labels().then((r) => r.ok && setLabels(r.data.labels)).catch(() => {}), []);

  async function send<T>(op: () => Promise<Result<T>>, onOk: (d: T) => void, onFail: () => void) {
    try {
      const r = await op();
      if (r.ok) onOk(r.data);
      else onFail();
    } catch {
      queue.current.push(() => send(op, onOk, onFail));
      setQueued(queue.current.length);
    }
  }
  useEffect(() => {
    const flush = () => {
      const q = queue.current.splice(0);
      setQueued(0);
      for (const run of q) void run();
    };
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, []);

  const swap = (id: string, next: Ev | null) => setEvents((p) => (next ? p.map((e) => (e.id === id ? next : e)) : p.filter((e) => e.id !== id)));
  const fail = (message: string, retry: () => void) => setFailed({ message, retry });

  // --- navigation ---
  const setView = (v: CalendarView) => {
    setViewState(v);
    track('calendar_view_changed', { view: v });
    void calendarApi.setView(v).catch(() => {});
  };
  const step = (by: 1 | -1) => {
    const p = parseKey(anchor);
    setAnchor(view === 'week' ? addDays(anchor, 7 * by) : makeKey(p.year, p.month + by, 1));
  };
  const goToday = () => setAnchor(today);
  /** "Ao salvar, navega ao mês do compromisso": agenda and gallery have no month, so they hand over to Month. */
  const reveal = (date: DayKey) => {
    setAnchor(date);
    if (view === 'agenda' || view === 'gallery') setViewState('month');
  };

  // --- events ---
  const [selected, setSelected] = useState<string | null>(null);

  const create = (value: EventFormValue, coverAssetId: string | null) => {
    const input = inputFromForm(value, coverAssetId);
    const attempt = () => {
      setFailed(null);
      const tmp = `tmp-${++seq.current}`;
      setEvents((p) => [...p, optimisticEv(tmp, input, tz, value.cover?.url ?? null)]);
      reveal(input.date);
      setSelected(tmp);
      void send(
        () => calendarApi.create(input),
        (e) => {
          const real = toEv(e);
          swap(tmp, real);
          setSelected((s) => (s === tmp ? real.id : s));
          refreshLabels();
        },
        () => {
          swap(tmp, null);
          setSelected((s) => (s === tmp ? null : s));
          fail(t('calendar.page.saveError'), attempt);
        },
      );
    };
    attempt();
    toast({ title: input.remindD1 || input.remindD0 ? t('calendar.form.saved') : t('calendar.page.saved') });
    track('calendar_event_created', { hasImage: !!coverAssetId, hasLocation: !!input.location, label: labelKind(labelsRef.current.find((l) => l.id === input.labelId)) });
  };

  const update = (id: string, value: EventFormValue, coverAssetId: string | null) => {
    const prev = evRef.current.find((e) => e.id === id);
    if (!prev || prev.pending) return;
    const input = inputFromForm(value, coverAssetId);
    const attempt = () => {
      setFailed(null);
      swap(id, { ...optimisticEv(id, input, tz, value.cover?.url ?? null), reminders: prev.reminders, pending: false });
      reveal(input.date);
      void send(
        () => calendarApi.update(id, input),
        (e) => {
          swap(id, toEv(e));
          refreshLabels();
        },
        () => {
          swap(id, prev);
          fail(t('calendar.page.saveError'), attempt);
        },
      );
    };
    attempt();
    toast({ title: t('calendar.page.saved') });
    track('calendar_event_edited', { hasImage: !!coverAssetId, hasLocation: !!input.location });
  };

  const remove = (id: string) => {
    const prev = evRef.current.find((e) => e.id === id);
    if (!prev || prev.pending) return;
    setSelected(null);
    swap(id, null);
    void send(
      () => calendarApi.remove(id),
      () => refreshLabels(),
      () => {
        setEvents((p) => [...p, prev]);
        fail(t('calendar.page.actionError'), () => remove(id));
      },
    );
    toast({ title: t('calendar.page.deleted') });
    track('calendar_event_deleted', {});
  };

  const duplicate = (id: string) => {
    const src = evRef.current.find((e) => e.id === id);
    if (!src || src.pending) return;
    void send(
      () => calendarApi.duplicate(id),
      (e) => {
        const copy = toEv(e);
        setEvents((p) => [...p, copy]);
        reveal(copy.date);
        setSelected(copy.id);
        toast({ title: t('calendar.page.duplicated', { date: shortDate(copy.date) }) });
        refreshLabels();
      },
      () => fail(t('calendar.page.actionError'), () => duplicate(id)),
    );
  };

  const setReminder = (id: string, kind: CalendarReminderKind, on: boolean) => {
    const prev = evRef.current.find((e) => e.id === id);
    if (!prev || prev.pending) return;
    const key = kind === 'd1' ? 'remindD1' : 'remindD0';
    swap(id, { ...prev, [key]: on });
    track('calendar_reminder_toggled', { kind, on });
    void send(
      () => calendarApi.reminders(id, { [key]: on }),
      (e) => swap(id, toEv(e)),
      () => {
        swap(id, prev);
        fail(t('calendar.page.actionError'), () => setReminder(id, kind, on));
      },
    );
  };

  // --- labels ---
  const toggleLabel = (id: string, visible: boolean) => {
    setLabels((p) => p.map((l) => (l.id === id ? { ...l, hidden: !visible } : l)));
    track('calendar_label_toggled', { visible });
    void calendarApi.updateLabel(id, { hidden: !visible }).then((r) => {
      if (!r.ok) {
        setLabels((p) => p.map((l) => (l.id === id ? { ...l, hidden: visible } : l)));
        fail(t('calendar.page.actionError'), () => toggleLabel(id, visible));
      }
    }).catch(() => {});
  };
  const saveLabel = async (id: string | null, input: { name: string; color: CalendarLabel['color'] }): Promise<LabelOutcome> => {
    try {
      const r = id ? await calendarApi.updateLabel(id, input) : await calendarApi.createLabel(input);
      if (!r.ok) return r.error.message === 'label_limit' ? 'limit' : 'error';
      setLabels((p) => (id ? p.map((l) => (l.id === id ? r.data : l)) : [...p, r.data]));
      if (!id) track('calendar_label_created', {});
      return 'ok';
    } catch {
      return 'error';
    }
  };
  const deleteLabel = async (id: string): Promise<LabelOutcome> => {
    try {
      const r = await calendarApi.deleteLabel(id);
      if (!r.ok) return 'error';
      setLabels((p) => p.filter((l) => l.id !== id));
      setEvents((p) => p.map((e) => (e.labelId === id ? { ...e, labelId: r.data.movedTo } : e)));
      refreshLabels();
      return 'ok';
    } catch {
      return 'error';
    }
  };

  const hidden = useMemo(() => new Set(labels.filter((l) => l.hidden).map((l) => l.id)), [labels]);
  const visible = useMemo(() => events.filter((e) => !hidden.has(e.labelId)), [events, hidden]);
  const selectedEv = events.find((e) => e.id === selected) ?? null;

  return {
    tz, now, today, view, setView, anchor, setAnchor, step, goToday, labels, events, visible, status, refetch, failed, dismissFailed: () => setFailed(null), queued,
    selected, selectedEv, select: setSelected, create, update, remove, duplicate, setReminder, toggleLabel, saveLabel, deleteLabel, formOf: formFromEv,
  };
}
