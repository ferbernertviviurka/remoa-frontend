'use client';

import { cloneElement, useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactElement, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '../button';
import { Icon, type IconName } from '../icons';
import { SkeletonBlock, SkeletonRegion } from '../skeleton';
import { LimitMeter, type LimitMeterProps } from './limit-meter';

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

export function PlanPopover({ trigger, label, title, text, meters = [], alert, illustration, benefits, cta, state = 'ready', loadingLabel = '', error, defaultOpen = false, onOpenChange }: PlanPopoverProps) {
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
    if (open || e.pointerType === 'touch' || !canHover()) return;
    timer.current = setTimeout(() => { setPinned(false); change(true, 'hover'); }, HOVER_OPEN_MS);
  };
  const leave = () => {
    clear();
    if (pinned) return;
    timer.current = setTimeout(() => change(false, 'hover'), HOVER_CLOSE_MS);
  };
  const click = (e: MouseEvent) => {
    e.preventDefault(); // impede o toggle do Radix: aqui clique sobre painel aberto por hover só fixa.
    clear();
    if (open && pinned) return change(false, 'click');
    lastTrigger.current = e.detail === 0 ? 'keyboard' : 'click';
    setPinned(true);
    change(true, lastTrigger.current);
  };

  const child = cloneElement(trigger, {
    onPointerEnter: enter,
    onPointerLeave: leave,
    onClick: click,
  });

  return (
    <Popover.Root open={open} onOpenChange={(next) => change(next, lastTrigger.current)} modal={false}>
      <Popover.Trigger asChild>{child}</Popover.Trigger>
      <Popover.Content
        role="dialog"
        aria-label={label}
        side="bottom"
        align="start"
        sideOffset={0}
        collisionPadding={16}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onFocusOutside={(e) => { if (pinned) e.preventDefault(); }}
        onPointerEnter={() => clear()}
        onPointerLeave={leave}
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
