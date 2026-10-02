'use client';

import type { ComponentProps } from 'react';
import { focusRing } from '../button';

/**
 * PlanChip: botão de 42 px na navbar ("Plano Free"). Pílula, borda 1,5 px, texto 14/700. Free: borda --border-strong e fundo --surface;
 * Pro: borda --primary e texto --primary-deep sobre --primary-tint. Com `aria-expanded="true"` (injetado pelo PlanPopover) a borda vira --primary
 * e o chevron gira 180° (250 ms). Repassa ref e props ARIA/handlers (é o gatilho do Popover). `children` = texto já traduzido. Sem className.
 */
export type PlanChipProps = Omit<ComponentProps<'button'>, 'className' | 'type'> & { plan: 'free' | 'pro' };

export function PlanChip({ plan, children, ...rest }: PlanChipProps) {
  return (
    <button
      type="button"
      {...rest}
      data-plan={plan}
      className={`group flex h-[42px] items-center gap-2 rounded-pill border-[1.5px] py-0 pl-4 pr-3 text-sm font-bold transition-[border-color,background-color] duration-200 ease-out aria-expanded:border-primary ${
        plan === 'pro' ? 'border-primary bg-primary-tint text-primary-deep' : 'border-border-strong bg-surface text-ink'
      } ${focusRing}`}
    >
      {children}
      <span className="flex transition-transform duration-[250ms] ease-[cubic-bezier(.22,1,.36,1)] group-aria-expanded:rotate-180">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </button>
  );
}
