'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import * as RD from '@radix-ui/react-dialog';
import { clsx } from 'clsx';
import { Icon } from '../icons';
import './canvas.css';

export type CommandItem = { id: string; group: string; label: string; hint?: string };

const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * CommandPalette (⌘K): Radix Dialog (foco preso, Esc fecha, devolve o foco ao gatilho) com busca + lista agrupada.
 * Padrão combobox/listbox: o foco fica no campo; ↑/↓ movem a opção ativa (`aria-activedescendant`), Enter executa, clique executa.
 * Filtra por `label`/`group` ignorando caixa e acento; sem resultado mostra `emptyText`. Ao escolher, fecha e chama
 * `onSelect(item)`; navegação/ação é do chamador (a paleta não conhece rotas). Controlado por `open`/`onOpenChange`;
 * o atalho ⌘K é registrado por quem monta. Textos (`title`, `placeholder`, `inputLabel`, `escText`, `emptyText`) por props.
 */
export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  inputLabel: string;
  placeholder: string;
  escText: string;
  emptyText: string;
  items: readonly CommandItem[];
  onSelect: (item: CommandItem) => void;
};

export function CommandPalette({ open, onOpenChange, title, inputLabel, placeholder, escText, emptyText, items, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const uid = useId();
  const returnTo = useRef<HTMLElement | null>(null); // Radix só devolve o foco a um Trigger; a paleta abre por atalho
  const shown = useMemo(() => {
    const q = norm(query.trim());
    return q ? items.filter((i) => norm(i.label).includes(q) || norm(i.group).includes(q)) : items;
  }, [items, query]);
  const idx = Math.min(active, Math.max(0, shown.length - 1));
  const optId = (i: number) => `${uid}-opt-${i}`;

  const run = (item: CommandItem | undefined) => {
    if (!item) return;
    onOpenChange(false);
    onSelect(item);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (shown.length) setActive((idx + (e.key === 'ArrowDown' ? 1 : shown.length - 1)) % shown.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(shown[idx]);
    }
  };

  return (
    <RD.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) { setQuery(''); setActive(0); }
        onOpenChange(o);
      }}
    >
      <RD.Portal>
        <RD.Overlay className="remoa-overlay fixed inset-0 z-30 bg-[rgba(26,21,51,.5)]" />
        <RD.Content aria-describedby={undefined} onOpenAutoFocus={() => { returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }} onCloseAutoFocus={(e) => { e.preventDefault(); returnTo.current?.focus(); }} className="cv-pop fixed left-1/2 top-24 z-30 w-[min(620px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-3xl bg-surface text-(--cv-ink) shadow-[0_30px_80px_rgba(26,21,51,.4)]">
          <RD.Title className="sr-only">{title}</RD.Title>
          <div className="flex h-16 items-center gap-3 border-b border-border px-5 text-muted">
            <Icon name="search" size={22} />
            <input
              role="combobox"
              aria-expanded="true"
              aria-controls={`${uid}-list`}
              aria-activedescendant={shown.length ? optId(idx) : undefined}
              aria-autocomplete="list"
              aria-label={inputLabel}
              placeholder={placeholder}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
              onKeyDown={onKeyDown}
              className="h-11 flex-1 border-0 bg-transparent text-[17px] text-(--cv-ink) outline-none placeholder:text-muted"
            />
            <kbd className="rounded-[7px] bg-(--cv-chip) px-2 py-[3px] font-sans text-xs font-bold">{escText}</kbd>
          </div>
          <div id={`${uid}-list`} role="listbox" aria-label={title} className="max-h-[420px] overflow-auto p-2">
            {shown.map((it, i) => (
              <div key={it.id}>
                {i === 0 || shown[i - 1]!.group !== it.group ? (
                  <div role="presentation" className="px-3 pb-1.5 pt-3 text-xs font-bold uppercase tracking-[.12em] text-muted">{it.group}</div>
                ) : null}
                <div
                  id={optId(i)}
                  role="option"
                  aria-selected={i === idx}
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(it)}
                  className={clsx('flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-[14px] px-3.5 font-semibold', i === idx && 'bg-primary-tint')}
                >
                  <span>{it.label}</span>
                  {it.hint ? <span className="text-[13px] font-medium text-muted">{it.hint}</span> : null}
                </div>
              </div>
            ))}
            {shown.length === 0 ? <div role="status" className="p-6 text-center text-muted">{emptyText}</div> : null}
          </div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
