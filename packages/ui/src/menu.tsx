'use client';

import * as RM from '@radix-ui/react-dropdown-menu';
import { focusRing, pressable } from './button';

/** Menu ancorado num botão. `label` é o texto do gatilho. */
export function Menu({
  label,
  items,
}: {
  label: string;
  items: ReadonlyArray<{ label: string; onSelect?: () => void; tone?: 'default' | 'danger' }>;
}) {
  return (
    <RM.Root>
      <RM.Trigger className={`inline-flex min-h-11 items-center rounded-btn border border-border bg-surface px-4 font-display text-sm font-bold text-text shadow-card ${pressable} ${focusRing}`}>
        {label}
      </RM.Trigger>
      <RM.Portal>
        <RM.Content sideOffset={8} className="remoa-pop z-50 min-w-44 rounded-map border border-border bg-surface p-1 shadow-lift">
          {items.map((item) => (
            <RM.Item
              key={item.label}
              onSelect={item.onSelect}
              className={`flex min-h-11 cursor-pointer items-center rounded-tag px-3 text-sm font-semibold outline-none data-[highlighted]:bg-primary-tint ${
                item.tone === 'danger' ? 'text-review-text' : 'text-text'
              } ${focusRing}`}
            >
              {item.label}
            </RM.Item>
          ))}
        </RM.Content>
      </RM.Portal>
    </RM.Root>
  );
}
