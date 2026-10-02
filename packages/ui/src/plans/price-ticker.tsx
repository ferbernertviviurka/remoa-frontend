'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * PriceTicker: preço em centavos que anima ~400 ms (ease-out cúbico) ao mudar `value`. `format(cents)` devolve o texto (ex.: Intl pt-BR).
 * Algarismos tabulares; a largura é reservada pelo maior valor entre origem e destino (sem salto de layout).
 * Leitor de tela recebe só o total final (`aria-live="polite"`); os quadros são aria-hidden. Movimento reduzido: valor final direto.
 */
export const TICK_MS = 400;

export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** Valor do quadro em `t` (0..1). Em t >= 1 devolve exatamente `to`. */
export function tickValue(from: number, to: number, t: number): number {
  if (t >= 1) return to;
  if (t <= 0) return from;
  return Math.round(from + (to - from) * easeOutCubic(t));
}

function reducedMotion(): boolean {
  if (typeof document === 'undefined') return true;
  const m = document.documentElement.dataset.motion;
  if (m === 'reduced') return true;
  if (m === 'full') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export type PriceTickerProps = { value: number; format: (cents: number) => string };

export function PriceTicker({ value, format }: PriceTickerProps) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    if (reducedMotion()) {
      setShown(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = (now - start) / TICK_MS;
      setShown(tickValue(from, value, t));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const wide = format(Math.max(shown, value, prev.current));
  return (
    <span className="relative inline-grid tabular-nums">
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">{wide}</span>
      <span aria-hidden="true" data-testid="ticker-frame" className="col-start-1 row-start-1">{format(shown)}</span>
      <span aria-live="polite" className="sr-only">{format(value)}</span>
    </span>
  );
}
