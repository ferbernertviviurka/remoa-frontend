'use client';

import { lazy, Suspense, useState, type ReactNode } from 'react';
import { focusRing, pressable } from './button-styles';

// P-512: Radix dropdown + Popper (~15 KB) só baixam quando o gatilho é acionado; passar o mouse ou focar já começa a baixar.
const load = () => import('./menu-radix');
const RadixMenu = lazy(load);

/**
 * Menu (Radix dropdown: setas, Esc, typeahead). `label` = texto do gatilho OU, com `icon`, o aria-label do gatilho.
 * `trigger`: 'outline' (padrão, botão com texto), 'tint' (fundo --primary-tint, "+ Card": `icon` antes do texto) ou
 * 'icon' (só ícone 36 px, "⋯"; `icon` obrigatório na prática). `align` start|end do conteúdo.
 * `items`: { label, onSelect, tone?: 'danger', icon? }.
 * Até o 1º uso o gatilho é um <button> leve, igual ao do Radix (abre no pointerdown e com Enter/Espaço/seta para baixo); aí monta o Radix já aberto.
 */
export type MenuProps = {
  label: string;
  items: ReadonlyArray<{ label: string; onSelect?: () => void; tone?: 'default' | 'danger'; icon?: ReactNode }>;
  trigger?: 'outline' | 'tint' | 'icon';
  icon?: ReactNode;
  align?: 'start' | 'end';
};

export const triggerClass = {
  outline: 'min-h-11 border border-border bg-surface px-4 shadow-card text-text',
  tint: 'min-h-9 bg-primary-tint px-3 text-primary-deep gap-1.5',
  icon: 'size-9 max-lg:size-11 justify-center text-muted hover:bg-primary-tint hover:text-text',
} as const;

export function Menu(props: MenuProps) {
  const { label, trigger = 'outline', icon } = props;
  const [openedBy, setOpenedBy] = useState<'pointer' | 'keyboard' | null>(null);
  const iconOnly = trigger === 'icon';
  const button = (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={false}
      data-state="closed"
      aria-label={iconOnly ? label : undefined}
      onPointerEnter={() => void load()}
      onFocus={() => void load()}
      onPointerDown={(e) => {
        if (e.button !== 0 || e.ctrlKey) return;
        e.preventDefault(); // como o Radix: o foco vai para o menu, não para o gatilho
        setOpenedBy('pointer');
      }}
      onKeyDown={(e) => {
        if (!['Enter', ' ', 'ArrowDown'].includes(e.key)) return;
        e.preventDefault();
        setOpenedBy('keyboard');
      }}
      className={`inline-flex items-center rounded-btn font-display text-sm font-bold ${triggerClass[trigger]} ${pressable} ${focusRing}`}
    >
      {icon ? <span aria-hidden="true" className="inline-flex">{icon}</span> : null}
      {iconOnly ? null : label}
    </button>
  );
  return openedBy ? (
    <Suspense fallback={button}>
      <RadixMenu {...props} openedBy={openedBy} />
    </Suspense>
  ) : (
    button
  );
}
