'use client';

import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { focusRing } from '../button-styles';
import { MapGlyph } from './glyph';

export type CardHandlesProps = {
  /** Nome acessível da bolinha de conectar ("Conectar "Sepse" a outro card"). */
  connectLabel: string;
  /** Nome acessível da alça do canto ("Redimensionar "Sepse""). */
  resizeLabel: string;
  /** 1/zoom do mapa: as alças ficam do tamanho do dedo em qualquer zoom. */
  scale?: number;
  onConnect: () => void;
  /** O dedo andou (dx, dy) px de tela desde que pegou a alça; `done` ao soltar. */
  onResize: (dx: number, dy: number, done: boolean) => void;
  /** Teclado (setas): um passo de largura (dw) ou altura (dh), -1 ou +1. */
  onResizeStep: (dw: number, dh: number) => void;
};

const STEP: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
const hit = `nodrag nopan absolute flex size-11 cursor-pointer items-center justify-center rounded-full ${focusRing}`;

/**
 * Alças do card selecionado no mapa do celular (D-1207): bolinha "conectar" na borda direita e alça de tamanho no canto
 * inferior direito, ambas com alvo de 44 px. `nodrag nopan` tira o gesto do React Flow (arrastar o card, mover o mapa).
 */
export function CardHandles({ connectLabel, resizeLabel, scale = 1, onConnect, onResize, onResizeStep }: CardHandlesProps) {
  const grab = useRef<{ x: number; y: number; id: number; dx: number; dy: number } | null>(null);
  const down = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    grab.current = { x: e.clientX, y: e.clientY, id: e.pointerId, dx: 0, dy: 0 };
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const g = grab.current;
    if (!g || g.id !== e.pointerId) return;
    g.dx = e.clientX - g.x;
    g.dy = e.clientY - g.y;
    onResize(g.dx, g.dy, false);
  };
  // pointercancel has no reliable coordinates: end with the last move
  const end = () => {
    const g = grab.current;
    if (!g) return;
    grab.current = null;
    onResize(g.dx, g.dy, true);
  };
  const key = (e: KeyboardEvent<HTMLButtonElement>) => {
    const s = STEP[e.key];
    if (!s) return;
    e.preventDefault();
    onResizeStep(s[0], s[1]);
  };
  return (
    <>
      <button type="button" aria-label={connectLabel} onClick={onConnect} className={`${hit} top-1/2 right-0`} style={{ transform: `translate(50%, -50%) scale(${scale})` }}>
        <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_6px_14px_rgba(36,26,92,.28)] ring-[3px] ring-surface">
          <MapGlyph name="link" size={16} />
        </span>
      </button>
      <button
        type="button"
        aria-label={resizeLabel}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={key}
        className={`${hit} right-0 bottom-0 [touch-action:none]`}
        style={{ transform: `translate(50%, 50%) scale(${scale})` }}
      >
        <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-[9px] border-2 border-primary bg-surface text-primary shadow-[0_6px_14px_rgba(36,26,92,.2)]">
          <MapGlyph name="resize" size={14} />
        </span>
      </button>
    </>
  );
}
