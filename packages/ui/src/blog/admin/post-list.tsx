'use client';

import type { ReactNode } from 'react';
import { Icon } from '../../icons';
import { focusRing } from '../../button-styles';

export type BlogStatus = 'published' | 'scheduled' | 'draft' | 'archived';

export const blogStatusTone: Record<BlogStatus, string> = {
  published: 'bg-primary-tint text-primary-deep',
  scheduled: 'bg-notif-map text-primary-deep',
  draft: 'bg-unknown-bg text-muted',
  archived: 'bg-review-bg text-review-text',
};

/**
 * BlogStatusTabs (F27 FR-2): resumo por status (4 pílulas com contagem, só leitura) e filtros Todos · Publicados · Agendados · Rascunhos · Arquivados
 * (grupo de botões `aria-pressed`, alvo ≥ 40 px; troca de cor em 200 ms). `value` é a chave ativa (`all` ou um `BlogStatus`); `onChange` recebe a chave.
 */
export type BlogStatusTabsProps = {
  summary: ReadonlyArray<{ status: BlogStatus; label: string; count: number }>;
  filtersLabel: string;
  filters: ReadonlyArray<{ key: 'all' | BlogStatus; label: string }>;
  value: 'all' | BlogStatus;
  onChange: (key: 'all' | BlogStatus) => void;
};

export function BlogStatusTabs({ summary, filtersLabel, filters, value, onChange }: BlogStatusTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-[22px] gap-y-2.5">
      <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
        {summary.map((s) => (
          <li key={s.status} className={`flex h-11 items-center gap-2.5 rounded-pill px-[18px] text-sm font-bold ${blogStatusTone[s.status]}`}>
            <span className="font-display text-[19px] font-extrabold">{s.count}</span>
            {s.label}
          </li>
        ))}
      </ul>
      <div role="group" aria-label={filtersLabel} className="flex flex-wrap gap-2 md:ml-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={value === f.key}
            onClick={() => onChange(f.key)}
            className={`h-11 rounded-pill border-[1.5px] px-3.5 text-[13.5px] font-bold transition-[background-color,border-color] duration-200 md:h-10 ${focusRing} ${value === f.key ? 'border-primary bg-primary-tint text-primary-deep' : 'border-border-strong bg-surface text-ink hover:border-primary'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** BlogPostList (F27 FR-2): tabela de posts (cabeçalho + linhas `BlogPostRow`); sem linhas mostra `empty`. Colunas: Post, Categoria, Template, Status, Data e ações (250 px). */
const GRID = 'lg:grid lg:grid-cols-[minmax(0,3.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_250px] lg:gap-4';
export type BlogPostListProps = { label: string; columns: { post: string; category: string; template: string; status: string; date: string; actions: string }; empty: string; children?: ReactNode; isEmpty?: boolean };

export function BlogPostList({ label, columns, empty, children, isEmpty }: BlogPostListProps) {
  return (
    <div role="table" aria-label={label} className="overflow-hidden rounded-[28px] border border-border bg-surface">
      <div role="rowgroup" className="hidden lg:block">
        <div role="row" className={`${GRID} bg-canvas px-5 py-3.5 text-xs font-bold tracking-[0.1em] text-muted uppercase`}>
          <span role="columnheader">{columns.post}</span>
          <span role="columnheader">{columns.category}</span>
          <span role="columnheader">{columns.template}</span>
          <span role="columnheader">{columns.status}</span>
          <span role="columnheader">{columns.date}</span>
          <span role="columnheader"><span className="sr-only">{columns.actions}</span></span>
        </div>
      </div>
      <div role="rowgroup">{isEmpty ? <div role="row"><div role="cell" className="px-5 py-10 text-center text-muted">{empty}</div></div> : children}</div>
    </div>
  );
}

/**
 * BlogPostRow (F27 FR-2): linha da lista. Miniatura 76 × 48 (`cover`, alt vazio: o título já está na linha), título, `/blog/slug` em mono, categoria, template, status (pílula colorida), data
 * e as ações **Editar** e **Ver** (links), **Duplicar** (ícone, `aria-label` com o título) e **Despublicar** (ícone laranja; só se `canUnpublish`, que pede motivo no `ReasonDialog`).
 * `viewHref` ausente desabilita "Ver" (post sem página pública). `delay` (ms) escalona a entrada (`slide` de 450 ms; 40 a 45 ms entre linhas).
 * Abaixo de 1024 px a linha empilha em cartão. Alvos ≥ 40 px (44 px no celular).
 */
export type BlogPostRowProps = {
  coverSrc: string;
  title: string;
  slug: string;
  category: string;
  templateLabel: string;
  status: BlogStatus;
  statusLabel: string;
  date: string;
  editHref: string;
  viewHref?: string;
  canUnpublish?: boolean;
  labels: { edit: string; view: string; duplicate: string; unpublish: string };
  onDuplicate?: () => void;
  onUnpublish?: () => void;
  delay?: number;
};

const act = `flex h-11 items-center gap-1.5 rounded-[11px] border-[1.5px] border-border-strong bg-surface px-3 text-[13px] font-bold text-ink no-underline hover:border-primary lg:h-10 ${focusRing}`;
const icoBtn = `flex size-11 items-center justify-center rounded-[11px] border-[1.5px] lg:size-10 ${focusRing}`;

export function BlogPostRow({ coverSrc, title, slug, category, templateLabel, status, statusLabel, date, editHref, viewHref, canUnpublish, labels, onDuplicate, onUnpublish, delay }: BlogPostRowProps) {
  return (
    <div role="row" className={`rb-row flex flex-col gap-3 border-t border-divider px-5 py-3 lg:min-h-[76px] lg:items-center ${GRID}`} style={delay ? { animationDelay: `${delay}ms` } : undefined}>
      <span role="cell" className="flex min-w-0 items-center gap-3.5">
        <img src={coverSrc} alt="" width={76} height={48} loading="lazy" className="h-12 w-[76px] shrink-0 rounded-[10px] object-cover" />
        <span className="flex min-w-0 flex-col leading-[1.3]">
          <span className="truncate font-bold">{title}</span>
          <span className="truncate font-mono text-xs text-muted">/blog/{slug}</span>
        </span>
      </span>
      <span role="cell" className="text-[14.5px]">{category}</span>
      <span role="cell"><span className="inline-block rounded-pill bg-chip px-3 py-[3px] text-[12.5px] font-bold text-primary-deep">{templateLabel}</span></span>
      <span role="cell"><span className={`inline-block rounded-pill px-3 py-[3px] text-[12.5px] font-bold ${blogStatusTone[status]}`}>{statusLabel}</span></span>
      <span role="cell" className="text-[13.5px] text-muted">{date}</span>
      <span role="cell" className="flex items-center gap-1.5 lg:justify-end">
        <a href={editHref} className={act}><Icon name="pencil" size={16} aria-hidden="true" />{labels.edit}</a>
        {viewHref ? <a href={viewHref} className={act}><Icon name="eye" size={16} aria-hidden="true" />{labels.view}</a> : <span aria-disabled="true" className={`${act} opacity-45`}><Icon name="eye" size={16} aria-hidden="true" />{labels.view}</span>}
        <button type="button" aria-label={`${labels.duplicate}: ${title}`} onClick={onDuplicate} className={`${icoBtn} border-border-strong bg-surface text-ink hover:border-primary`}><Icon name="copy" size={18} aria-hidden="true" /></button>
        {canUnpublish ? <button type="button" aria-label={`${labels.unpublish}: ${title}`} onClick={onUnpublish} className={`${icoBtn} border-review/40 bg-review-bg text-review-text`}><Icon name="archive" size={18} aria-hidden="true" /></button> : null}
      </span>
    </div>
  );
}
