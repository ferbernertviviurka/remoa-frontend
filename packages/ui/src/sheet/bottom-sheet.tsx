'use client';

import { useRef, type ReactNode } from 'react';
import * as RD from '@radix-ui/react-dialog';
import { focusRing } from '../button-styles';

/**
 * Bottom sheet (F23 FR-13): painel escuro com alça, scrim, foco preso e devolvido ao gatilho (Radix Dialog).
 * Fecha pela alça, pelo scrim, por Esc e arrastando para baixo (Q-084). Textos por props.
 * Alturas: `auto` (conteúdo), `half` (até 50% da tela), `full` (até 100%, abaixo da safe area do topo).
 * Movimento: só transform/opacity (tokens.css); reduzido (sistema ou `data-motion="reduced"`) aparece direto.
 */
export type BottomSheetProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** nome acessível do diálogo */
  title: string;
  /** título visível no cabeçalho (padrão: oculto; o diálogo já tem `title`) */
  showTitle?: boolean;
  /** aria-label da alça (botão que fecha) */
  closeLabel: string;
  height?: 'auto' | 'half' | 'full';
  trigger?: ReactNode;
  children?: ReactNode;
};

const heights = { auto: 'max-h-[92dvh]', half: 'h-[50dvh]', full: 'h-[calc(100dvh-52px)]' };
/** arraste: fecha acima de 100 px ou com velocidade > 0,5 px/ms (e ≥ 24 px) */
const CLOSE_DISTANCE = 100;
const CLOSE_VELOCITY = 0.5;
const CLICK_SLOP = 6;

export function BottomSheet({ open, onOpenChange, title, showTitle, closeLabel, height = 'auto', trigger, children }: BottomSheetProps) {
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const moved = useRef(false);
  const opener = useRef<HTMLElement | null>(null);

  const down = (e: React.PointerEvent) => {
    if (e.button > 0) return;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    moved.current = false;
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !panel.current) return;
    d.dy = Math.max(0, e.clientY - d.y);
    if (d.dy > CLICK_SLOP && !moved.current) {
      moved.current = true; // captura só ao arrastar: um toque simples ainda chega ao botão da alça
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    panel.current.style.transition = 'none';
    panel.current.style.transform = `translateY(${d.dy}px)`;
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !panel.current) return;
    const v = d.dy / Math.max(1, performance.now() - d.t);
    if (d.dy > CLOSE_DISTANCE || (d.dy >= 24 && v > CLOSE_VELOCITY)) {
      onOpenChange?.(false); // a saída parte da posição atual (keyframe só tem `to`)
    } else {
      panel.current.style.transition = 'transform 250ms cubic-bezier(0.22, 1, 0.36, 1)';
      panel.current.style.transform = '';
    }
  };

  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <RD.Trigger asChild>{trigger}</RD.Trigger> : null}
      <RD.Portal>
        <RD.Overlay className="remoa-bscrim fixed inset-0 z-50 bg-ink/40" />
        <RD.Content
          ref={panel}
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            opener.current = document.activeElement as HTMLElement | null;
          }}
          onCloseAutoFocus={(e) => {
            if (trigger) return; // Radix devolve ao gatilho
            e.preventDefault(); // aberto por estado: devolve a quem tinha o foco
            opener.current?.focus();
          }}
          className={`remoa-bsheet fixed inset-x-0 bottom-0 z-[55] mx-auto flex w-full max-w-[640px] flex-col rounded-t-[30px] bg-admin-nav text-on-dark shadow-[0_-20px_60px_rgba(26,21,51,.4)] outline-none ${heights[height]}`}
        >
          <div
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            className="shrink-0 touch-none select-none px-4 pt-2.5"
          >
            <RD.Close
              aria-label={closeLabel}
              className={`flex h-11 w-full items-center justify-center rounded-btn ${focusRing}`}
            >
              <span aria-hidden="true" className="block h-[5px] w-11 rounded-full bg-white/30" />
            </RD.Close>
            <RD.Title className={showTitle ? 'px-1 pb-2.5 pt-0.5 font-display text-[22px] font-extrabold tracking-[-0.025em]' : 'sr-only'}>{title}</RD.Title>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(24px,env(safe-area-inset-bottom))]">{children}</div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
