'use client';

import type { RefObject } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '../button';
import { Icon } from '../icons';
import { SkeletonBlock, SkeletonRegion } from '../skeleton';
import { LimitMeter } from './limit-meter';
import type { PlanPopoverProps } from './plan-popover';

/** Painel do PlanPopover (Radix Popover + Popper), baixado só na 1ª interação com o chip (P-512). Estado e tempos ficam em plan-popover.tsx. */
export type PlanPopoverPanelProps = Omit<PlanPopoverProps, 'trigger' | 'defaultOpen' | 'onOpenChange'> & {
  open: boolean;
  pinned: boolean;
  anchor: RefObject<HTMLElement | null>;
  contentId: string;
  onOpenChange: (open: boolean) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
};

export default function PlanPopoverPanel({ open, pinned, anchor, contentId, onOpenChange, onPointerEnter, onPointerLeave, label, title, text, meters = [], alert, illustration, benefits, cta, state = 'ready', loadingLabel = '', error }: PlanPopoverPanelProps) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <Popover.Anchor virtualRef={anchor} />
      <Popover.Content
        id={contentId}
        role="dialog"
        aria-label={label}
        side="bottom"
        align="start"
        sideOffset={0}
        collisionPadding={16}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onFocusOutside={(e) => { if (pinned) e.preventDefault(); }}
        onInteractOutside={(e) => { if (anchor.current?.contains(e.target as Node)) e.preventDefault(); }} // o chip é o gatilho: o clique nele é tratado lá
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        className="z-30 pt-2.5 outline-none"
      >
        <div
          className="pop box-border flex max-h-[780px] w-[440px] max-w-[calc(100vw-32px)] flex-col gap-4 overflow-auto rounded-list border border-border bg-surface p-6 text-ink shadow-[0_30px_70px_rgba(36,26,92,.25)]"
          style={{ transformOrigin: '28px 0' }}
        >
          <div className="flex flex-col gap-1.5">
            <h2 className="m-0 font-display text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em]">{title}</h2>
            {text ? <p className="m-0 text-sm leading-normal text-muted">{text}</p> : null}
          </div>
          {alert}
          {state === 'loading' ? (
            <SkeletonRegion label={loadingLabel}>
              <div className="grid grid-cols-2 gap-2.5">
                {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} height={86} radius={16} />)}
              </div>
            </SkeletonRegion>
          ) : state === 'error' && error ? (
            <div role="alert" className="flex flex-col items-start gap-3 rounded-[16px] bg-canvas p-4 text-sm">
              <span>{error.message}</span>
              <Button variant="secondary" size="sm" onClick={error.onRetry}>{error.retryLabel}</Button>
            </div>
          ) : meters.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              {meters.map((m) => <LimitMeter key={m.label} {...m} />)}
            </div>
          ) : null}
          {illustration ? <div className="flex items-center justify-center rounded-[20px] bg-canvas px-2 py-2.5 [&>*]:h-auto [&>*]:w-full [&>*]:max-w-[380px]">{illustration}</div> : null}
          {benefits ? (
            <div className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-border-strong bg-primary-tint p-4">
              <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">{benefits.title}</span>
              {benefits.items.map((b) => (
                <span key={b.lead} className="flex items-start gap-3">
                  <span className="flex size-[38px] shrink-0 items-center justify-center rounded-xl bg-surface text-primary-deep"><Icon name={b.icon} size={20} /></span>
                  <span className="text-sm leading-[1.45]"><span className="font-bold">{b.lead}</span> {b.text}</span>
                </span>
              ))}
            </div>
          ) : null}
          {cta}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
