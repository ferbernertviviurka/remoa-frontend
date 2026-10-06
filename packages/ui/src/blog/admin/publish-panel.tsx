'use client';

import { useId } from 'react';
import { Icon } from '../../icons';
import { focusRing } from '../../button-styles';
import type { BlogTemplate } from '../types';
import { TemplatePicker, type TemplatePickerProps } from './template-picker';

export type PublishStatus = 'draft' | 'scheduled' | 'published';

/**
 * PublishPanel (F27 FR-7): aba Publicação do editor. Template (3 cartões, `TemplatePicker` em lista), Status (Rascunho · Agendado · Publicado, 3 botões `aria-pressed`),
 * "Publicar em" (`datetime-local`, só com Agendado; `pop`; horário de Brasília), Categoria (chips), Autor e "Ver no site" (link `viewHref`; **desabilitado** quando o post não está publicado:
 * `aria-disabled`, sem `href`, fora da ordem de tabulação). A validação "agendar exige data futura" é do app (`scheduleError` mostra o erro). Controlado.
 */
export type PublishPanelProps = {
  labels: { template: string; status: string; scheduleAt: string; scheduleHint: string; category: string; author: string; viewOnSite: string };
  templatePicker: Omit<TemplatePickerProps, 'layout' | 'label'> & { label?: string };
  template: BlogTemplate;
  statusOptions: ReadonlyArray<{ value: PublishStatus; label: string }>;
  status: PublishStatus;
  onStatusChange: (s: PublishStatus) => void;
  scheduleAt: string;
  onScheduleAtChange: (v: string) => void;
  scheduleError?: string;
  categories: ReadonlyArray<{ value: string; label: string }>;
  category: string;
  onCategoryChange: (v: string) => void;
  authors: ReadonlyArray<{ value: string; label: string }>;
  author: string;
  onAuthorChange: (v: string) => void;
  viewHref?: string;
};

const cap = 'text-xs font-bold tracking-[0.12em] text-muted uppercase';
const seg = (on: boolean) => `flex-1 h-11 rounded-xl border-[1.5px] text-[13.5px] font-bold transition-[background-color,border-color] duration-200 ${focusRing} ${on ? 'border-primary bg-primary-tint text-primary-deep' : 'border-border-strong bg-surface text-ink hover:border-primary'}`;

export function PublishPanel(p: PublishPanelProps) {
  const id = useId();
  const L = p.labels;
  const published = p.status === 'published';
  return (
    <div className="flex flex-col gap-[18px] p-5">
      <div className="flex flex-col gap-2">
        <span className={cap}>{L.template}</span>
        <TemplatePicker label={p.templatePicker.label ?? L.template} value={p.template} onChange={p.templatePicker.onChange} options={p.templatePicker.options} layout="list" />
      </div>
      <div className="flex flex-col gap-2">
        <span className={cap}>{L.status}</span>
        <div role="group" aria-label={L.status} className="flex gap-1.5">
          {p.statusOptions.map((s) => <button key={s.value} type="button" aria-pressed={p.status === s.value} onClick={() => p.onStatusChange(s.value)} className={seg(p.status === s.value)}>{s.label}</button>)}
        </div>
        {p.status === 'scheduled' ? (
          <div className="pop flex flex-col gap-1.5">
            <label htmlFor={`${id}-d`} className="text-[13.5px] font-bold">{L.scheduleAt}</label>
            <input id={`${id}-d`} type="datetime-local" value={p.scheduleAt} aria-invalid={p.scheduleError ? true : undefined} onChange={(e) => p.onScheduleAtChange(e.target.value)} className={`box-border h-12 rounded-[13px] border-[1.5px] bg-surface px-3 text-[15px] ${p.scheduleError ? 'border-review' : 'border-border-strong'} ${focusRing}`} />
            {p.scheduleError ? <span role="alert" className="text-[12.5px] font-semibold text-review-text">{p.scheduleError}</span> : <span className="text-[12.5px] text-muted">{L.scheduleHint}</span>}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <span className={cap}>{L.category}</span>
        <div role="group" aria-label={L.category} className="flex flex-wrap gap-1.5">
          {p.categories.map((c) => <button key={c.value} type="button" aria-pressed={p.category === c.value} onClick={() => p.onCategoryChange(c.value)} className={`h-11 rounded-pill border-[1.5px] px-3.5 text-[13.5px] font-bold transition-[background-color,border-color] duration-200 ${focusRing} ${p.category === c.value ? 'border-primary bg-primary-tint text-primary-deep' : 'border-border-strong bg-surface text-ink hover:border-primary'}`}>{c.label}</button>)}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className={cap}>{L.author}</span>
        <div role="group" aria-label={L.author} className="flex gap-1.5">
          {p.authors.map((a) => <button key={a.value} type="button" aria-pressed={p.author === a.value} onClick={() => p.onAuthorChange(a.value)} className={seg(p.author === a.value)}>{a.label}</button>)}
        </div>
      </div>
      <div className="flex gap-2 border-t border-divider pt-1.5">
        {published && p.viewHref ? (
          <a href={p.viewHref} target="_blank" rel="noopener" className={`flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-[13px] border-[1.5px] border-border-strong bg-surface text-[13.5px] font-bold text-ink no-underline hover:border-primary ${focusRing}`}>
            {L.viewOnSite}
            <Icon name="share" size={16} aria-hidden="true" />
          </a>
        ) : (
          <span aria-disabled="true" role="link" className="flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-[13px] border-[1.5px] border-border-strong bg-surface text-[13.5px] font-bold text-ink opacity-45">
            {L.viewOnSite}
            <Icon name="share" size={16} aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * AutosaveIndicator (F27 FR-5): bolinha + texto do salvamento ("Salvando…", "Salvo agora", "Falha ao salvar"). `role="status"` (aviso educado, sem roubar o foco).
 * `state`: `saving` (âmbar), `saved` (verde), `error` (laranja). O texto vem pronto de `t()`. A bolinha troca de cor em 300 ms.
 */
export function AutosaveIndicator({ state, text }: { state: 'saving' | 'saved' | 'error'; text: string }) {
  const dot = { saving: 'bg-watch', saved: 'bg-ok', error: 'bg-review' }[state];
  return (
    <span role="status" data-state={state} className="flex items-center gap-2 text-[13.5px] text-muted">
      <span aria-hidden="true" className={`size-[9px] rounded-full transition-colors duration-300 ${dot}`} />
      {text}
    </span>
  );
}

/** PublishBlockers (F27 FR-9): "Falta resolver: …" no diálogo de publicar (caixa laranja com o `title` e os itens separados por vírgula). Sem itens não renderiza (publicação liberada). `role="alert"`. */
export function PublishBlockers({ title, items }: { title: string; items: ReadonlyArray<string> }) {
  if (items.length === 0) return null;
  return (
    <div role="alert" className="rounded-[14px] bg-review-bg px-3.5 py-3 text-sm leading-normal text-review-text">
      <b>{title}</b> {items.join(', ')}
    </div>
  );
}
