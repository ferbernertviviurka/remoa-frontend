'use client';

import type { KeyboardEvent } from 'react';
import { Icon } from '../icons';
import { LABEL_PALETTE, labelTone } from './palette';
import type { CalendarLabelItem } from './types';

/** LabelChip: pílula com ponto + nome. Com `onClick` vira botão de escolha (`aria-pressed`, ex.: etiqueta no formulário); sem, é só texto. */
export type LabelChipProps = { label: CalendarLabelItem; selected?: boolean; onClick?: () => void };

export function LabelChip({ label, selected, onClick }: LabelChipProps) {
  const t = labelTone(label.color);
  const body = (<><span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: t.dot }} />{label.name}</>);
  if (!onClick) return <span className="inline-flex items-center gap-2 rounded-pill px-3 py-1 text-sm font-bold" style={{ background: t.bg, color: t.text }}>{body}</span>;
  return (
    <button
      type="button"
      aria-pressed={!!selected}
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-pill border-[1.5px] px-4 text-sm font-bold text-ink transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      style={selected ? { background: t.bg, color: t.text, borderColor: t.dot } : { borderColor: 'var(--border-strong)' }}
    >{body}</button>
  );
}

/**
 * LabelToggleRow (F25 FR-9): linha da lateral com quadrado na cor da etiqueta (interruptor de visibilidade, 200 ms), nome e contagem.
 * `role="switch"`; desligada, a linha esmaece.
 */
export type LabelToggleRowProps = { label: CalendarLabelItem; visible: boolean; count: number; onToggle: (visible: boolean) => void; text: { show: (name: string) => string } };

export function LabelToggleRow({ label, visible, count, onToggle, text }: LabelToggleRowProps) {
  return (
    <button type="button" role="switch" aria-checked={visible} aria-label={text.show(label.name)} onClick={() => onToggle(!visible)} className="flex min-h-11 w-full items-center gap-3 rounded-[12px] px-2 text-left hover:bg-primary-tint focus-visible:outline-2 focus-visible:outline-primary">
      <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-[7px] border-2 text-white transition-colors duration-200" style={{ background: visible ? label.color : 'transparent', borderColor: label.color }}>
        <span className={`flex transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}><Icon name="check" size={14} strokeWidth={3} /></span>
      </span>
      <span className={`grow font-semibold text-ink transition-opacity duration-200 ${visible ? '' : 'opacity-45'}`}>{label.name}</span>
      <span aria-hidden="true" className="text-[13px] text-muted">{count}</span>
    </button>
  );
}

/** LabelColorPicker (F25 FR-9): paleta de 8 cores; `radiogroup` com setas; alvo de 44 px. `names` = nome falado de cada cor (chave da paleta). */
export type LabelColorPickerProps = { value: string; onChange: (color: string) => void; text: { label: string; names: Record<string, string> } };

export function LabelColorPicker({ value, onChange, text }: LabelColorPickerProps) {
  const idx = Math.max(0, LABEL_PALETTE.findIndex((p) => p.color === value));
  const onKey = (e: KeyboardEvent) => {
    const by = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!by) return;
    e.preventDefault();
    const n = (idx + by + LABEL_PALETTE.length) % LABEL_PALETTE.length;
    onChange(LABEL_PALETTE[n]!.color);
    (e.currentTarget.querySelectorAll('[role=radio]')[n] as HTMLElement | undefined)?.focus();
  };
  return (
    <div role="radiogroup" aria-label={text.label} onKeyDown={onKey} className="flex flex-wrap">
      {LABEL_PALETTE.map((p, i) => (
        <button key={p.key} type="button" role="radio" aria-checked={i === idx && value === p.color} tabIndex={i === idx ? 0 : -1} aria-label={text.names[p.key] ?? p.key} onClick={() => onChange(p.color)} className="flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-primary">
          <span className="flex size-7 items-center justify-center rounded-full border-2 border-white text-white" style={{ background: p.color, boxShadow: value === p.color ? `0 0 0 2px ${p.color}` : 'none' }}>
            {value === p.color ? <Icon name="check" size={14} strokeWidth={3} /> : null}
          </span>
        </button>
      ))}
    </div>
  );
}
