'use client';

import { useState } from 'react';
import { Button } from '../button';
import { Icon } from '../icons';
import { Input } from '../input';
import { Switch } from '../switch';
import { Textarea } from '../textarea';
import { CoverUpload, type CoverUploadProps } from './cover-upload';
import { LabelChip } from './labels';
import type { CalendarLabelItem } from './types';

export type EventFormValue = {
  title: string;
  labelId: string;
  date: string;
  allDay: boolean;
  start: string;
  end: string;
  location: string;
  description: string;
  cover: { name: string; url: string } | null;
  remindD1: boolean;
  remindD0: boolean;
};
export type EventFormField = 'title' | 'date' | 'end' | 'location' | 'description';

export const EVENT_LIMITS = { titleMin: 2, titleMax: 120, location: 160, description: 2000 } as const;

/** Regras de FR-10: título 2–120, data obrigatória, fim ≥ início, local ≤ 160, descrição ≤ 2.000. Devolve só os campos inválidos. */
export function validateEventForm(v: EventFormValue): Partial<Record<EventFormField, 'required' | 'min' | 'max' | 'order'>> {
  const e: Partial<Record<EventFormField, 'required' | 'min' | 'max' | 'order'>> = {};
  const t = v.title.trim().length;
  if (t < EVENT_LIMITS.titleMin) e.title = 'min';
  else if (t > EVENT_LIMITS.titleMax) e.title = 'max';
  if (!v.date) e.date = 'required';
  if (!v.allDay && v.end && v.start && v.end < v.start) e.end = 'order';
  if (v.location.length > EVENT_LIMITS.location) e.location = 'max';
  if (v.description.length > EVENT_LIMITS.description) e.description = 'max';
  return e;
}

/**
 * EventForm (F25 FR-10/11): conteúdo do modal de 600 px de criar/editar (a casca é `Dialog size="form"`; ele traz o próprio cartão).
 * Controlado (`value`/`onChange`). Erros inline por campo depois que o campo é tocado; "Salvar compromisso" só ativa com título e data válidos
 * e sem outro erro. Dia inteiro esmaece início e fim. Capa por `CoverUpload`. Avisos: 1 dia antes e no dia.
 * Enter dentro de um campo não envia (a descrição tem linhas): use o botão.
 */
export type EventFormProps = {
  mode: 'create' | 'edit';
  value: EventFormValue;
  onChange: (v: EventFormValue) => void;
  labels: readonly CalendarLabelItem[];
  onSubmit: () => void;
  onCancel: () => void;
  onFile: CoverUploadProps['onFile'];
  saving?: boolean;
  text: {
    titleNew: string; titleEdit: string; close: string;
    title: string; label: string; date: string; start: string; end: string; allDay: string; location: string; description: string; cover: string;
    reminders: string; d1: string; d1Hint: string; d0: string; d0Hint: string;
    cancel: string; save: string; saving: string;
    errors: { title: string; titleMax: string; date: string; end: string; location: string; description: string };
    coverText: CoverUploadProps['text'];
  };
};

export function EventForm({ mode, value, onChange, labels, onSubmit, onCancel, onFile, saving, text }: EventFormProps) {
  const [touched, setTouched] = useState<Partial<Record<EventFormField, boolean>>>({});
  const errs = validateEventForm(value);
  const set = <K extends keyof EventFormValue>(k: K, v: EventFormValue[K]) => onChange({ ...value, [k]: v });
  const touch = (f: EventFormField) => () => setTouched((t) => ({ ...t, [f]: true }));
  const msg = (f: EventFormField) => {
    if (!errs[f] || !touched[f]) return undefined;
    return { title: errs.title === 'max' ? text.errors.titleMax : text.errors.title, date: text.errors.date, end: text.errors.end, location: text.errors.location, description: text.errors.description }[f];
  };
  const canSave = Object.keys(errs).length === 0 && !saving;
  const Err = ({ f }: { f: EventFormField }) => (msg(f) ? <span role="alert" className="-mt-1 text-[13.5px] font-semibold text-review-text">{msg(f)}</span> : null);
  const aria = (f: EventFormField) => ({ 'aria-invalid': msg(f) ? true : undefined, onBlur: touch(f) });
  const title = mode === 'edit' ? text.titleEdit : text.titleNew;

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (canSave) onSubmit(); }} className="flex flex-col rounded-[32px] bg-surface shadow-[0_40px_110px_rgba(26,21,51,.55)]" noValidate>
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <h2 className="font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-ink">{title}</h2>
        <button type="button" aria-label={text.close} onClick={onCancel} className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-border bg-surface text-ink focus-visible:outline-2 focus-visible:outline-primary"><Icon name="close" size={18} /></button>
      </div>
      <div className="flex flex-col gap-4 px-6 py-4">
        <Input label={text.title} value={value.title} maxLength={EVENT_LIMITS.titleMax + 20} onChange={(e) => set('title', e.target.value)} required {...aria('title')} />
        <Err f="title" />
        <div role="group" aria-label={text.label} className="flex flex-col gap-2">
          <span className="font-bold text-ink">{text.label}</span>
          <div className="flex flex-wrap gap-2">{labels.map((l) => <LabelChip key={l.id} label={l} selected={l.id === value.labelId} onClick={() => set('labelId', l.id)} />)}</div>
        </div>
        <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-3 max-sm:grid-cols-1">
          <Input type="date" label={text.date} value={value.date} onChange={(e) => set('date', e.target.value)} required {...aria('date')} />
          <div className={`transition-opacity duration-200 ${value.allDay ? 'opacity-35' : ''}`}><Input type="time" label={text.start} value={value.start} disabled={value.allDay} onChange={(e) => set('start', e.target.value)} /></div>
          <div className={`transition-opacity duration-200 ${value.allDay ? 'opacity-35' : ''}`}><Input type="time" label={text.end} value={value.end} disabled={value.allDay} onChange={(e) => set('end', e.target.value)} {...aria('end')} /></div>
        </div>
        <Err f="date" />
        <Err f="end" />
        <Switch size="lg" label={text.allDay} checked={value.allDay} onCheckedChange={(c) => set('allDay', c)} />
        <Input label={text.location} value={value.location} onChange={(e) => set('location', e.target.value)} {...aria('location')} />
        <Err f="location" />
        <Textarea label={text.description} rows={3} value={value.description} onChange={(e) => set('description', e.target.value)} {...aria('description')} />
        <Err f="description" />
        <div className="flex flex-col gap-2">
          <span className="font-bold text-ink">{text.cover}</span>
          <CoverUpload value={value.cover} onFile={onFile} onRemove={() => set('cover', null)} text={text.coverText} />
        </div>
        <div className="flex flex-col rounded-[20px] bg-soft px-4 py-1.5">
          <span className="pb-1 pt-2.5 text-xs font-bold uppercase tracking-[0.12em] text-muted">{text.reminders}</span>
          {([['remindD1', text.d1, text.d1Hint], ['remindD0', text.d0, text.d0Hint]] as const).map(([k, t, hint]) => (
            <div key={k} className="flex min-h-[58px] items-center gap-3 border-t border-border">
              <span className="flex grow flex-col leading-tight"><span className="font-bold text-ink">{t}</span><span className="text-[13px] text-muted">{hint}</span></span>
              <Switch size="lg" label={t} hideLabel checked={value[k]} onCheckedChange={(c) => set(k, c)} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2.5 px-6 pb-6 pt-2">
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>{text.cancel}</Button>
        <Button type="submit" size="lg" disabled={!canSave} loading={saving} loadingLabel={text.saving}>{text.save}</Button>
      </div>
    </form>
  );
}
