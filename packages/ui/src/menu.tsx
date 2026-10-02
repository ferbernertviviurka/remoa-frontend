'use client';

import type { ReactNode } from 'react';
import * as RM from '@radix-ui/react-dropdown-menu';
import { focusRing, pressable } from './button';

/**
 * Menu (Radix dropdown: setas, Esc, typeahead). `label` = texto do gatilho OU, com `icon`, o aria-label do gatilho.
 * `trigger`: 'outline' (padrão, botão com texto), 'tint' (fundo --primary-tint, "+ Card": `icon` antes do texto) ou
 * 'icon' (só ícone 36 px, "⋯"; `icon` obrigatório na prática). `align` start|end do conteúdo.
 * `items`: { label, onSelect, tone?: 'danger', icon? }.
 */
export type MenuProps = {
  label: string;
  items: ReadonlyArray<{ label: string; onSelect?: () => void; tone?: 'default' | 'danger'; icon?: ReactNode }>;
  trigger?: 'outline' | 'tint' | 'icon';
  icon?: ReactNode;
  align?: 'start' | 'end';
};

const triggerClass = {
  outline: 'min-h-11 border border-border bg-surface px-4 shadow-card text-text',
  tint: 'min-h-9 bg-primary-tint px-3 text-primary-deep gap-1.5',
  icon: 'size-9 max-lg:size-11 justify-center text-muted hover:bg-primary-tint hover:text-text',
} as const;

export function Menu({ label, items, trigger = 'outline', icon, align = 'start' }: MenuProps) {
  const iconOnly = trigger === 'icon';
  return (
    <RM.Root>
      <RM.Trigger
        aria-label={iconOnly ? label : undefined}
        className={`inline-flex items-center rounded-btn font-display text-sm font-bold ${triggerClass[trigger]} ${pressable} ${focusRing}`}
      >
        {icon ? <span aria-hidden="true" className="inline-flex">{icon}</span> : null}
        {iconOnly ? null : label}
      </RM.Trigger>
      <RM.Portal>
        <RM.Content align={align} sideOffset={8} className="remoa-pop z-50 min-w-44 rounded-map border border-border bg-surface p-1 shadow-lift">
          {items.map((item) => (
            <RM.Item
              key={item.label}
              onSelect={item.onSelect}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-tag px-3 text-sm font-semibold outline-none data-[highlighted]:bg-primary-tint ${
                item.tone === 'danger' ? 'text-review-text' : 'text-text'
              } ${focusRing}`}
            >
              {item.icon ? <span aria-hidden="true" className="inline-flex">{item.icon}</span> : null}
              {item.label}
            </RM.Item>
          ))}
        </RM.Content>
      </RM.Portal>
    </RM.Root>
  );
}
