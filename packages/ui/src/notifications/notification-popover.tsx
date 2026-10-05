'use client';

import { useId, useRef, type ReactElement } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '../button';
import { Icon } from '../icons';
import { SkeletonBlock, SkeletonRegion } from '../skeleton';
import { focusRing } from '../button-styles';
import { NotificationEmpty, NotificationGroups, type NotificationGroupsProps } from './notification-item';

export type NotificationTab = 'all' | 'unread';

/**
 * NotificationPopover (F26 FR-2/FR-4/FR-14): Radix Popover modal (foco preso), 430 px, `role="dialog"`. `trigger` = <BellButton/> (recebe aria-expanded/haspopup/controls).
 * Ao abrir o foco vai para o título; ao fechar (Esc, clique fora, navegar) volta ao sino. Entrada `pop` (400 ms, origem no sino); itens em `slide` (450 ms, 35 ms entre itens).
 * Lista rola a partir de 468 px. Abas Todas / Não lidas (N) com `role="tablist"`; o app filtra `groups` conforme `tab`.
 * Estados: `state` 'ready' (vazio = `emptyLabel`, ou `allReadLabel` na aba Não lidas), 'loading' (esqueleto), 'error' (linha com "Tentar de novo").
 * Regra de uso: componente controlado (`open`/`onOpenChange`); fechar ao navegar é do app (setar `open=false` na mudança de rota). Todo texto chega por props.
 */
export type NotificationPopoverProps = Pick<NotificationGroupsProps, 'groups' | 'formatMeta' | 'markReadLabel' | 'onOpen' | 'onMarkRead'> & {
  trigger: ReactElement<Record<string, unknown>>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialogLabel: string;
  title: string;
  markAllLabel: string;
  onMarkAll: () => void;
  settingsLabel: string;
  settingsHref: string;
  tabsLabel: string;
  tabAllLabel: string;
  tabUnreadLabel: string;
  tab: NotificationTab;
  onTabChange: (tab: NotificationTab) => void;
  unreadCount: number;
  seeAllLabel: string;
  seeAllHref: string;
  emptyLabel: string;
  allReadLabel: string;
  state?: 'ready' | 'loading' | 'error';
  loadingLabel?: string;
  error?: { message: string; retryLabel: string; onRetry: () => void };
};

export function NotificationPopover({
  trigger, open, onOpenChange, dialogLabel, title, markAllLabel, onMarkAll, settingsLabel, settingsHref, tabsLabel, tabAllLabel, tabUnreadLabel, tab, onTabChange, unreadCount,
  seeAllLabel, seeAllHref, emptyLabel, allReadLabel, state = 'ready', loadingLabel = '', error, groups, ...list
}: NotificationPopoverProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const panelId = useId();
  const empty = groups.every((g) => g.items.length === 0);
  const tabs: ReadonlyArray<{ id: NotificationTab; label: string }> = [{ id: 'all', label: tabAllLabel }, { id: 'unread', label: tabUnreadLabel }];
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange} modal>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          role="dialog"
          aria-label={dialogLabel}
          side="bottom"
          align="end"
          sideOffset={10}
          collisionPadding={16}
          onOpenAutoFocus={(e) => { e.preventDefault(); titleRef.current?.focus(); }}
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
