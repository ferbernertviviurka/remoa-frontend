'use client';

import { cloneElement, lazy, Suspense, useId, useRef, useState, type ReactElement } from 'react';
import type { NotificationGroupsProps } from './notification-item';

// P-512: Radix Popover + Popper (~11 KB) e o corpo do painel só baixam na 1ª interação com o sino (hover, foco, clique).
const Panel = lazy(() => import('./notification-popover-panel'));

export type NotificationTab = 'all' | 'unread';

/**
 * NotificationPopover (F26 FR-2/FR-4/FR-14): Radix Popover modal (foco preso), 430 px, `role="dialog"`. `trigger` = <BellButton/> (recebe aria-expanded/haspopup/controls).
 * Ao abrir o foco vai para o título; ao fechar (Esc, clique fora, navegar) volta ao sino. Entrada `pop` (400 ms, origem no sino); itens em `slide` (450 ms, 35 ms entre itens).
 * Lista rola a partir de 468 px. Abas Todas / Não lidas (N) com `role="tablist"`; o app filtra `groups` conforme `tab`.
 * Estados: `state` 'ready' (vazio = `emptyLabel`, ou `allReadLabel` na aba Não lidas), 'loading' (esqueleto), 'error' (linha com "Tentar de novo").
 * O painel (Radix) baixa na 1ª interação (P-512): passar o mouse ou focar o sino já começa a baixar; o sino é pintado sem ele.
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

export function NotificationPopover({ trigger, ...panel }: NotificationPopoverProps) {
  const { open, onOpenChange } = panel;
  const [armed, setArmed] = useState(open);
  const anchor = useRef<HTMLElement>(null);
  const contentId = useId();
  const arm = () => setArmed(true);
  // o que o Popover.Trigger do Radix punha no sino
  const child = cloneElement(trigger, {
    ref: anchor,
    'aria-haspopup': 'dialog',
    'aria-expanded': open,
    'aria-controls': contentId,
    'data-state': open ? 'open' : 'closed',
    onPointerEnter: arm,
    onFocus: arm,
    onClick: () => {
      arm();
      onOpenChange(!open);
    },
  });
  return (
    <>
      {child}
      {armed || open ? (
        <Suspense fallback={null}>
          <Panel {...panel} anchor={anchor} contentId={contentId} />
        </Suspense>
      ) : null}
    </>
  );
}
