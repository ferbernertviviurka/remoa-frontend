'use client';

import { useRef } from 'react';
import * as RM from '@radix-ui/react-dropdown-menu';
import { focusRing, pressable } from './button-styles';
import { triggerClass, type MenuProps } from './menu';

/**
 * O Menu de verdade (Radix dropdown + Popper), baixado só quando o gatilho leve de menu.tsx é acionado (P-512). Monta já aberto; aberto pelo
 * teclado, o foco vai ao 1º item, como o Radix faz quando o gatilho dele recebe a tecla. Depois disso é o Radix puro (fechar, reabrir, foco de volta).
 */
export default function RadixMenu({ label, items, trigger = 'outline', icon, align = 'start', openedBy }: MenuProps & { openedBy: 'pointer' | 'keyboard' }) {
  const iconOnly = trigger === 'icon';
  const moved = useRef(false);
  return (
    <RM.Root defaultOpen>
      <RM.Trigger
        aria-label={iconOnly ? label : undefined}
        className={`inline-flex items-center rounded-btn font-display text-sm font-bold ${triggerClass[trigger]} ${pressable} ${focusRing}`}
      >
        {icon ? <span aria-hidden="true" className="inline-flex">{icon}</span> : null}
        {iconOnly ? null : label}
      </RM.Trigger>
      <RM.Portal>
        <RM.Content
          align={align}
          sideOffset={8}
          onFocus={(e) => {
            // o Radix foca o conteúdo ao abrir; aberto pelo teclado, passa ao 1º item (só na 1ª abertura: depois o Radix já ouve o teclado)
            if (openedBy !== 'keyboard' || moved.current || e.target !== e.currentTarget) return;
            moved.current = true;
            e.currentTarget.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
          }}
          className="remoa-pop z-50 min-w-44 rounded-map border border-border bg-surface p-1 shadow-lift"
        >
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
