'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { focusRing } from './button';

/**
 * InlineTitle: h1 (Manrope 800 28) editável no lugar. Em repouso é `<h1><button>` sem borda de input
 * (nome acessível = `value` + `editHint` só para leitor de tela); clique/Enter → `<input aria-label={inputLabel}>`
 * com o mesmo tipo. Enter/blur salva (`onSave(texto)` só se mudou e não ficou vazio), Esc cancela. O foco volta ao botão.
 */
export type InlineTitleProps = {
  value: string;
  inputLabel: string;
  editHint: string;
  onSave: (next: string) => void;
  maxLength?: number;
};

const type = 'font-display text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-text';

export function InlineTitle({ value, inputLabel, editHint, onSave, maxLength }: InlineTitleProps) {
  const [editing, setEditing] = useState(false);
  const done = useRef(false);
  const button = useRef<HTMLButtonElement>(null);

  const finish = (next: string | null) => {
    if (done.current) return;
    done.current = true;
    setEditing(false);
    requestAnimationFrame(() => button.current?.focus());
    const v = next?.trim();
    if (v && v !== value) onSave(v);
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
        defaultValue={value}
        maxLength={maxLength}
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={onKeyDown}
        onBlur={(e) => finish(e.currentTarget.value)}
        className={`w-full min-w-0 rounded-tag bg-transparent px-1 -mx-1 outline-none ${type} ${focusRing}`}
      />
    );

  return (
    <h1 className={`m-0 min-w-0 ${type}`}>
      <button
        ref={button}
        type="button"
        onClick={() => {
          done.current = false;
          setEditing(true);
        }}
        className={`-mx-1 max-w-full truncate rounded-tag px-1 text-left hover:bg-canvas ${focusRing}`}
      >
        {value}
        <span className="sr-only">{` ${editHint}`}</span>
      </button>
    </h1>
  );
}
