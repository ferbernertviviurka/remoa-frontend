'use client';

import { useId } from 'react';
import * as RS from '@radix-ui/react-select';
import { fieldControl, focusRing } from './button-styles';

/** Lista suspensa com rótulo. `options` são valor + texto. */
export function Select({
  label,
  placeholder,
  options,
  value,
  defaultValue,
  onValueChange,
}: {
  label: string;
  placeholder?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label id={id} className="text-xs font-semibold text-text">{label}</label>
      <RS.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange}>
        <RS.Trigger aria-labelledby={id} className={`flex min-h-11 items-center justify-between gap-3 text-left ${fieldControl} ${focusRing}`}>
          <RS.Value placeholder={placeholder} />
          <RS.Icon className="text-muted" aria-hidden="true">▾</RS.Icon>
        </RS.Trigger>
        <RS.Portal>
          <RS.Content className="remoa-pop z-50 overflow-hidden rounded-map border border-border bg-surface p-1 shadow-lift" position="popper" sideOffset={6}>
            <RS.Viewport>
              {options.map((option) => (
                <RS.Item
                  key={option.value}
                  value={option.value}
                  className={`flex min-h-11 cursor-pointer items-center rounded-tag px-3 text-sm text-text outline-none data-[highlighted]:bg-primary-tint data-[highlighted]:text-primary-deep ${focusRing}`}
                >
                  <RS.ItemText>{option.label}</RS.ItemText>
                </RS.Item>
              ))}
            </RS.Viewport>
          </RS.Content>
        </RS.Portal>
      </RS.Root>
    </div>
  );
}
