'use client';

import type { ReactNode } from 'react';
import * as RA from '@radix-ui/react-accordion';
import { focusRing } from './button-styles';

/** Lista expansível. Um item aberto por vez. */
export function Accordion({ items, onValueChange }: { items: ReadonlyArray<{ value: string; title: string; content: ReactNode }>; /** Valor do item aberto; '' quando todos fecham. */ onValueChange?: (value: string) => void }) {
  return (
    <RA.Root type="single" collapsible onValueChange={onValueChange} className="flex flex-col overflow-hidden rounded-map border border-border bg-surface shadow-card">
      {items.map((item) => (
        <RA.Item key={item.value} value={item.value} className="border-b border-border last:border-b-0">
          <RA.Header>
            <RA.Trigger className={`group flex min-h-12 w-full items-center justify-between px-4 text-left font-display text-sm font-bold text-text ${focusRing}`}>
              {item.title}
              <span aria-hidden="true" className="text-muted transition-transform duration-200 group-data-[state=open]:rotate-45">+</span>
            </RA.Trigger>
          </RA.Header>
          <RA.Content className="px-4 pb-4 text-sm text-muted data-[state=open]:animate-[remoa-fade-in_180ms_ease-out]">
            {item.content}
          </RA.Content>
        </RA.Item>
      ))}
    </RA.Root>
  );
}
