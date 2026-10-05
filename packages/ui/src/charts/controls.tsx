'use client';

import type { ReactNode } from 'react';
import { focusRing } from '../button-styles';

/**
 * KpiCard (indicador; "StatCard" do pedido, renomeado: já existe StatCard no admin): cartão de 30 de raio, padding 22/24, ícone 36 px,
 * número 46 px/800 (tabular), `unit`, `sub` (13 px) e extras opcionais: `dots` (7 pontos da semana, `on` = marcado) e `bar` (barra 10 px com `pct` e marca `target`).
 * `index` escalona a entrada (`slide`, 70 ms por cartão). `icon` é decorativo (aria-hidden). `iconTone`: brand | review | watch | steady.
 */
export type KpiCardProps = {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  icon?: ReactNode;
  iconTone?: 'brand' | 'review' | 'watch' | 'steady';
  dots?: ReadonlyArray<{ label: string; on: boolean }>;
  bar?: { pct: number; target?: number; tone?: 'brand' | 'review' | 'watch' };
  index?: number;
  /** nome acessível do bloco de pontos/barra (ex.: "Dias da semana com revisão") */
  extraLabel?: string;
};
const iconTone = { brand: 'bg-primary-tint text-primary-deep', review: 'bg-review-bg text-review-text', watch: 'bg-watch-bg text-watch-text', steady: 'bg-steady-bg text-steady-text' };
const barTone = { brand: 'var(--primary)', review: 'var(--state-review-border)', watch: 'var(--state-watch-border)' };

export function KpiCard({ label, value, unit, sub, icon, iconTone: tone = 'brand', dots, bar, index = 0, extraLabel }: KpiCardProps) {
  return (
    <div className="slide box-border flex flex-col gap-2.5 rounded-[30px] border border-border bg-surface px-6 py-[22px]" style={{ animationDelay: `${70 * index}ms` }}>
      <span className="flex items-center gap-2.5 font-bold text-muted">
        {icon ? <span aria-hidden="true" className={`flex size-9 items-center justify-center rounded-[12px] ${iconTone[tone]}`}>{icon}</span> : null}
        {label}
      </span>
      <span className="flex items-baseline gap-2">
        <span className="font-display text-[46px] font-extrabold leading-none tracking-[-.04em] tabular-nums text-ink">{value}</span>
        {unit ? <span className="text-[15px] font-bold text-muted">{unit}</span> : null}
      </span>
      {dots ? (
        <div role="img" aria-label={extraLabel ?? dots.map((d) => d.label).join(', ')} className="flex gap-1.5">
          {dots.map((d, i) => (
            <span key={i} aria-hidden="true" className="flex flex-col items-center gap-1 text-[11.5px] font-bold text-muted">
              <span data-on={d.on} className={`rv-popn block size-[22px] rounded-full border-2 ${d.on ? 'border-primary bg-primary' : 'border-border-strong bg-transparent'}`} style={{ animationDelay: `${80 + 60 * i}ms` }} />
              {d.label}
            </span>
          ))}
        </div>
      ) : null}
      {bar ? (
        <span role="img" aria-label={extraLabel} className="relative block h-2.5 rounded-[5px] bg-divider">
          <span data-testid="kpi-bar" className="fillx block h-2.5 rounded-[5px]" style={{ width: `${Math.min(100, Math.max(0, bar.pct))}%`, background: barTone[bar.tone ?? 'brand'] }} />
          {bar.target != null ? <span aria-hidden="true" className="absolute -top-1 h-[18px] w-0.5 rounded-[1px] bg-ink" style={{ left: `${bar.target}%` }} /> : null}
        </span>
      ) : null}
      {sub ? <span className="text-[13px] text-muted">{sub}</span> : null}
    </div>
  );
}

/**
 * ToggleChip: chip de inclusão da fila (raio 16, borda 1,5 px, 52 px de altura mínima, 250 ms). `aria-pressed` = `pressed`.
 * `title` 15/700, `sub` 12,5 px, `count` 22/800 à direita; círculo de check 28 px (opaco só ligado). `color` = cor do círculo/número (css, ex. 'var(--state-review-border)').
 * Use dentro de `role="group" aria-label`.
 */
export type ToggleChipProps = { pressed: boolean; onPressedChange: (next: boolean) => void; title: string; sub?: string; count: number | string; color?: string; disabled?: boolean };

export function ToggleChip({ pressed, onPressedChange, title, sub, count, color = 'var(--primary)', disabled }: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={() => onPressedChange(!pressed)}
      className={`flex min-h-[52px] items-center gap-2.5 rounded-[16px] border-[1.5px] py-1.5 pl-3 pr-[18px] text-left transition-[background-color,border-color] duration-[250ms] disabled:opacity-50 ${pressed ? 'bg-primary-tint' : 'border-border-strong bg-surface hover:border-primary'} ${focusRing}`}
      style={pressed ? { borderColor: color } : undefined}
    >
      <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full text-on-primary transition-opacity duration-[250ms]" style={{ background: pressed ? color : 'var(--state-unknown-soft)', opacity: pressed ? 1 : 0.5 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6" /></svg>
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[15px] font-bold text-ink">{title}</span>
        {sub ? <span className="text-[12.5px] text-muted">{sub}</span> : null}
      </span>
      <span className="ml-1.5 font-display text-[22px] font-extrabold tabular-nums" style={{ color: pressed ? color : 'var(--muted)' }}>{count}</span>
    </button>
  );
}

/**
 * SwitchRow: linha com interruptor (role=switch, `aria-checked`), 56 px de altura mínima, raio 16, trilho 44×26, bolinha 20 (desliza 250 ms).
 * `title` (ellipsis), `sub`, `chip` (pílula à direita, ex.: "12 + 3"). Use dentro de `role="group" aria-label`.
 */
export type SwitchRowProps = { checked: boolean; onCheckedChange: (next: boolean) => void; title: string; sub?: string; chip?: string; disabled?: boolean };

export function SwitchRow({ checked, onCheckedChange, title, sub, chip, disabled }: SwitchRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`flex min-h-14 w-full items-center gap-3 rounded-[16px] border-[1.5px] px-3 py-1.5 text-left transition-[background-color,border-color] duration-[250ms] disabled:opacity-50 ${checked ? 'border-primary bg-primary-tint' : 'border-border bg-surface'} ${focusRing}`}
    >
      <span aria-hidden="true" className={`relative block h-[26px] w-11 shrink-0 rounded-pill transition-colors duration-200 ${checked ? 'bg-primary' : 'bg-unknown-soft'}`}>
        <span className="switch-thumb absolute left-[3px] top-[3px] block size-5 rounded-full bg-surface shadow-[0_2px_5px_rgba(26,21,51,.3)]" style={{ transform: `translateX(${checked ? 18 : 0}px)` }} />
      </span>
      <span className="flex min-w-0 grow flex-col leading-tight">
        <span className="truncate font-bold text-ink">{title}</span>
        {sub ? <span className="text-[12.5px] text-muted">{sub}</span> : null}
      </span>
      {chip ? <span className={`shrink-0 rounded-pill px-2.5 py-[3px] text-[12.5px] font-bold ${checked ? 'bg-primary text-on-primary' : 'bg-divider text-muted'}`}>{chip}</span> : null}
    </button>
  );
}
