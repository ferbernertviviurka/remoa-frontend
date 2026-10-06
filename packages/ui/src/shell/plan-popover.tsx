'use client';

import { cloneElement, lazy, Suspense, useCallback, useEffect, useId, useRef, useState, type MouseEvent, type PointerEvent, type ReactElement, type ReactNode } from 'react';
import type { IconName } from '../icons';
import type { LimitMeterProps } from './limit-meter';

// P-512: Radix Popover + Popper (~11 KB) só baixam na 1ª interação com o chip (hover, foco, clique); o chip é pintado sem eles.
const Panel = lazy(() => import('./plan-popover-panel'));

export const HOVER_OPEN_MS = 120;
export const HOVER_CLOSE_MS = 200;

export type PlanPopoverTrigger = 'hover' | 'click' | 'keyboard';

/**
 * PlanPopover: painel do plano na navbar (F14 FR-4..FR-8). Radix Popover não modal, controlado aqui, SEM portal (fica logo após o gatilho no DOM,
 * então Tab entra no painel). `trigger` = um <PlanChip/> (recebe aria-expanded/aria-controls e ref). Abre com hover após 120 ms (só `(hover: hover)`),
 * fecha 200 ms depois de o ponteiro sair do gatilho e do painel, salvo se fixado. Clique/toque/Enter/Espaço abre e FIXA; novo clique, Esc ou clique fora fecham;
 * a saída do foco fecha se não estiver fixado. O foco fica no chip. `onOpenChange(open, trigger)` informa como abriu (telemetria `plan_popover_opened`).
 * `defaultOpen` abre já fixado (stories/testes).
 * Conteúdo (tudo texto já traduzido): `label` (aria-label do dialog), `title`, `text`, `meters` (grade 2 × 2 de LimitMeter), `alert` (ReactNode, ex.: <Alert/> de conta legada ou em atraso),
 * `illustration` (nó; o app usa next/image), `benefits` ({ title, items: [{ icon, lead, text }] }), `cta` (slot, ex.: link "Fazer upgrade"; no Pro "Gerenciar assinatura").
 * `state`: 'ready' | 'loading' (4 esqueletos no lugar dos medidores, `loadingLabel` para leitor de tela) | 'error' (`error` = { message, retryLabel, onRetry }; no lugar dos medidores).
 * Entrada `pop` (400 ms, origem no chip); sem animação com Reduzir movimento (motion.css).
 * O painel (Radix) é baixado na 1ª interação (P-512): o hover já começa a baixar e os 120 ms seguem valendo; o painel aparece quando chega.
 */
export type PlanBenefits = { title: string; items: ReadonlyArray<{ icon: IconName; lead: string; text: string }> };
export type PlanPopoverProps = {
  trigger: ReactElement<Record<string, unknown>>;
  label: string;
  title: string;
  text?: string;
  meters?: ReadonlyArray<LimitMeterProps>;
  alert?: ReactNode;
  illustration?: ReactNode;
  benefits?: PlanBenefits;
  cta?: ReactNode;
  state?: 'ready' | 'loading' | 'error';
  loadingLabel?: string;
  error?: { message: string; retryLabel: string; onRetry: () => void };
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, trigger: PlanPopoverTrigger) => void;
};

const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

export function PlanPopover({ trigger, defaultOpen = false, onOpenChange, ...content }: PlanPopoverProps) {
  const [armed, setArmed] = useState(defaultOpen);
  const anchor = useRef<HTMLElement>(null);
  const contentId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [pinned, setPinned] = useState(defaultOpen);
  const openRef = useRef(defaultOpen);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastTrigger = useRef<PlanPopoverTrigger>('click');
  const clear = () => clearTimeout(timer.current);
  useEffect(() => clear, []);

  const change = useCallback(
    (next: boolean, by: PlanPopoverTrigger) => {
      if (!next) setPinned(false);
      if (next === openRef.current) return;
      openRef.current = next;
      setOpen(next);
      onOpenChange?.(next, by);
    },
    [onOpenChange],
  );

  const enter = (e: PointerEvent) => {
    clear();
    setArmed(true);
    if (open || e.pointerType === 'touch' || !canHover()) return;
    timer.current = setTimeout(() => { setPinned(false); change(true, 'hover'); }, HOVER_OPEN_MS);
  };
  const leave = () => {
    clear();
    if (pinned) return;
    timer.current = setTimeout(() => change(false, 'hover'), HOVER_CLOSE_MS);
  };
  const click = (e: MouseEvent) => {
    clear();
    setArmed(true);
    if (open && pinned) return change(false, 'click');
    lastTrigger.current = e.detail === 0 ? 'keyboard' : 'click';
    setPinned(true);
    change(true, lastTrigger.current);
  };

  // o que o Popover.Trigger do Radix punha no chip
  const child = cloneElement(trigger, {
    ref: anchor,
    'aria-haspopup': 'dialog',
    'aria-expanded': open,
    'aria-controls': contentId,
    'data-state': open ? 'open' : 'closed',
    onPointerEnter: enter,
    onPointerLeave: leave,
    onFocus: () => setArmed(true),
    onClick: click,
  });

  return (
    <>
      {child}
      {armed ? (
        <Suspense fallback={null}>
          <Panel {...content} open={open} pinned={pinned} anchor={anchor} contentId={contentId} onOpenChange={(next) => change(next, lastTrigger.current)} onPointerEnter={clear} onPointerLeave={leave} />
        </Suspense>
      ) : null}
    </>
  );
}
