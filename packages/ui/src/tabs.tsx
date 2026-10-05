'use client';

import type { ReactNode } from 'react';
import * as RT from '@radix-ui/react-tabs';
import { focusRing } from './button-styles';

/** Abas. `label` nomeia o grupo. A primeira aba abre se `defaultValue` não vier. */
export function Tabs({
  label,
  tabs,
  defaultValue,
  value,
  onValueChange,
}: {
  label: string;
  tabs: ReadonlyArray<{ value: string; label: string; content: ReactNode }>;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <RT.Root defaultValue={defaultValue ?? tabs[0]?.value} value={value} onValueChange={onValueChange} className="flex flex-col gap-3">
      <RT.List aria-label={label} className="inline-flex w-fit gap-1 rounded-btn border border-border bg-canvas p-1">
        {tabs.map((tab) => (
          <RT.Trigger
            key={tab.value}
            value={tab.value}
            className={`min-h-11 rounded-tag px-3 text-sm font-semibold text-muted transition-colors duration-150 data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-card ${focusRing}`}
          >
            {tab.label}
          </RT.Trigger>
        ))}
      </RT.List>
      {tabs.map((tab) => (
        <RT.Content key={tab.value} value={tab.value} className="remoa-pop rounded-map border border-border bg-surface p-4 text-sm text-text shadow-card outline-none">
          {tab.content}
        </RT.Content>
      ))}
    </RT.Root>
  );
}
