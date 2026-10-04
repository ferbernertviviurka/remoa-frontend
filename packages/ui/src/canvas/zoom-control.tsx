'use client';

import { focusRing } from '../button';
import { Icon } from '../icons';

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 1.4;
export const ZOOM_STEP = 0.1;
/** Próximo zoom (arredondado a 2 casas, preso a 10–140%). */
export function stepZoom(zoom: number, dir: 1 | -1): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((zoom + dir * ZOOM_STEP) * 100) / 100));
}

/**
 * ZoomControl v2: "−  100%  +  [Ajustar]". `percent` já formatado ("100%"). Diminuir/Aumentar desabilitam nos limites
 * (`canZoomOut`/`canZoomIn`; use `stepZoom`, `ZOOM_MIN`, `ZOOM_MAX`). `fitText` = texto do botão "Ajustar".
 * `aria-label` do grupo e dos botões ícone por prop. Alvos 40 px.
 */
export type ZoomControlProps = {
  'aria-label': string;
  percent: string;
  zoomOutLabel: string;
  zoomInLabel: string;
  fitText: string;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFit: () => void;
  canZoomOut?: boolean;
  canZoomIn?: boolean;
};

const icon = `flex size-10 cursor-pointer items-center justify-center rounded-[12px] hover:bg-primary-tint disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent ${focusRing}`;

export function ZoomControl({ 'aria-label': ariaLabel, percent, zoomOutLabel, zoomInLabel, fitText, onZoomOut, onZoomIn, onFit, canZoomOut = true, canZoomIn = true }: ZoomControlProps) {
  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex items-center gap-0.5 rounded-[16px] border border-border bg-surface p-1 shadow-[0_8px_24px_rgba(36,26,92,.08)]">
      <button type="button" aria-label={zoomOutLabel} disabled={!canZoomOut} onClick={onZoomOut} className={icon}><Icon name="minus" size={18} /></button>
      <output className="min-w-[52px] text-center text-[13px] font-bold tabular-nums">{percent}</output>
      <button type="button" aria-label={zoomInLabel} disabled={!canZoomIn} onClick={onZoomIn} className={icon}><Icon name="plus" size={18} /></button>
      <button type="button" onClick={onFit} className={`h-10 cursor-pointer rounded-[12px] bg-(--cv-chip) px-3 text-[13px] font-bold hover:bg-primary-tint ${focusRing}`}>{fitText}</button>
    </div>
  );
}
