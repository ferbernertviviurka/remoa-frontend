'use client';

import { useId, useRef, type RefObject } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '../button';
import { Icon } from '../icons';
import { SkeletonBlock, SkeletonRegion } from '../skeleton';
import { focusRing } from '../button-styles';
import { NotificationEmpty, NotificationGroups } from './notification-item';
import type { NotificationPopoverProps, NotificationTab } from './notification-popover';

/** Painel do NotificationPopover (Radix Popover modal + Popper), baixado só na 1ª interação com o sino (P-512). */
export type NotificationPopoverPanelProps = Omit<NotificationPopoverProps, 'trigger'> & { anchor: RefObject<HTMLElement | null>; contentId: string };

export default function NotificationPopoverPanel({
  anchor, contentId, open, onOpenChange, dialogLabel, title, markAllLabel, onMarkAll, settingsLabel, settingsHref, tabsLabel, tabAllLabel, tabUnreadLabel, tab, onTabChange, unreadCount,
  seeAllLabel, seeAllHref, emptyLabel, allReadLabel, state = 'ready', loadingLabel = '', error, groups, ...list
}: NotificationPopoverPanelProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const panelId = useId();
  const empty = groups.every((g) => g.items.length === 0);
  const tabs: ReadonlyArray<{ id: NotificationTab; label: string }> = [{ id: 'all', label: tabAllLabel }, { id: 'unread', label: tabUnreadLabel }];
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange} modal>
      <Popover.Anchor virtualRef={anchor} />
      <Popover.Portal>
        <Popover.Content
          role="dialog"
          aria-label={dialogLabel}
          side="bottom"
          align="end"
          sideOffset={10}
          collisionPadding={16}
          id={contentId}
          onOpenAutoFocus={(e) => { e.preventDefault(); titleRef.current?.focus(); }}
          onCloseAutoFocus={(e) => { e.preventDefault(); anchor.current?.focus(); }} // volta ao sino, como o Popover.Trigger fazia
          className="z-[35] outline-none"
        >
          <div className="pop box-border flex w-[430px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-list border border-border bg-surface text-ink shadow-[0_30px_70px_rgba(36,26,92,.25)]" style={{ transformOrigin: 'calc(100% - 22px) 0' }}>
            <div className="flex items-center justify-between gap-2.5 px-5 pb-1.5 pt-[18px]">
              <h2 ref={titleRef} tabIndex={-1} className="m-0 font-display text-[22px] font-extrabold tracking-[-0.025em] outline-none">{title}</h2>
              <span className="flex items-center gap-1">
                {unreadCount > 0 ? (
                  <button type="button" onClick={onMarkAll} className={`h-11 rounded-xl border-0 bg-transparent px-2.5 text-[13.5px] font-bold text-primary-deep ${focusRing}`}>{markAllLabel}</button>
                ) : null}
                <a href={settingsHref} aria-label={settingsLabel} className={`flex size-11 items-center justify-center rounded-xl text-muted ${focusRing}`}><Icon name="cog" size={20} /></a>
              </span>
            </div>
            <div role="tablist" aria-label={tabsLabel} className="flex gap-1 border-b border-divider px-3.5">
              {tabs.map((tb) => {
                const on = tab === tb.id;
                return (
                  <button
                    key={tb.id}
                    type="button"
                    role="tab"
                    id={`${panelId}-${tb.id}`}
                    aria-selected={on}
                    aria-controls={panelId}
                    onClick={() => onTabChange(tb.id)}
                    className={`flex h-11 items-center gap-2 border-0 border-b-[3px] bg-transparent px-2.5 text-[14.5px] ${on ? 'border-primary font-extrabold text-ink' : 'border-transparent font-semibold text-muted'} ${focusRing}`}
                  >
                    {tb.label}
                    {tb.id === 'unread' && unreadCount > 0 ? <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-review px-1.5 text-[11.5px] font-extrabold text-on-primary">{unreadCount}</span> : null}
                  </button>
                );
              })}
            </div>
            <div id={panelId} role="tabpanel" aria-labelledby={`${panelId}-${tab}`} className="flex max-h-[468px] flex-col overflow-auto">
              {state === 'loading' ? (
                <SkeletonRegion label={loadingLabel}>
                  <div className="flex flex-col gap-3 px-5 py-4">
                    {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} height={64} radius={14} />)}
                  </div>
                </SkeletonRegion>
              ) : state === 'error' && error ? (
                <div role="alert" className="flex flex-col items-start gap-3 px-5 py-5 text-sm text-ink">
                  <span>{error.message}</span>
                  <Button variant="secondary" size="sm" onClick={error.onRetry}>{error.retryLabel}</Button>
                </div>
              ) : empty ? (
                <NotificationEmpty text={tab === 'unread' ? allReadLabel : emptyLabel} />
              ) : (
                <NotificationGroups groups={groups} variant="popover" {...list} />
              )}
            </div>
            <a href={seeAllHref} className={`flex h-[52px] items-center justify-center gap-2 border-t border-divider bg-soft text-[14.5px] font-bold text-primary-deep no-underline ${focusRing}`}>{seeAllLabel}<Icon name="right" size={16} /></a>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
