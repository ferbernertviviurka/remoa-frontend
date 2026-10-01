'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { clsx } from 'clsx';
import { focusRing } from './button';

/**
 * EdgeLabel: pílula 11,5px do rótulo de conexão, editável inline. Clique → input; Enter/blur salva
 * (`onSave(texto | null)`, só se mudou), Esc cancela. Sem rótulo mostra `emptyText` em tom de aviso.
 */
export type EdgeLabelProps = {
  label: string | null;
  emptyText: string;
  /** aria-label do botão (ex.: "Editar rótulo: X"). */
  buttonLabel: string;
  /** aria-label do campo de edição. */
  inputLabel: string;
  onSave: (label: string | null) => void;
};

export function EdgeLabel({ label, emptyText, buttonLabel, inputLabel, onSave }: EdgeLabelProps) {
  const [editing, setEditing] = useState(false);
  const done = useRef(false);

  const finish = (value: string | null) => {
    if (done.current) return;
    done.current = true;
    setEditing(false);
    if (value === null) return;
    const next = value.trim() || null;
    if (next !== label) onSave(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation(); // canvas shortcuts (Delete, Ctrl+Z) must not fire while typing
    if (e.key === 'Enter') finish(e.currentTarget.value);
    if (e.key === 'Escape') finish(null);
  };

  if (editing)
    return (
      <input
        aria-label={inputLabel}
        defaultValue={label ?? ''}
        autoFocus
        onKeyDown={onKeyDown}
        onBlur={(e) => finish(e.currentTarget.value)}
        className={`w-44 rounded-pill border border-primary bg-surface px-2.5 py-0.5 text-[11.5px] text-text ${focusRing}`}
      />
    );

  return (
    <button
      type="button"
      aria-label={buttonLabel}
      onClick={() => {
        done.current = false;
        setEditing(true);
      }}
      className={clsx(
        'rounded-pill border px-2.5 py-0.5 text-[11.5px] font-semibold',
        focusRing,
        label ? 'border-border bg-surface text-text' : 'border-watch bg-watch-bg text-watch-text',
      )}
    >
      {label ?? emptyText}
    </button>
  );
}
