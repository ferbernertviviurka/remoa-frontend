'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons';
import { SkeletonBlock, SkeletonRegion } from '../skeleton';
import { useReducedMotion } from './use-reduced-motion';

/** Número que conta até `target`: 40 ms por passo, 14 passos por mês de diferença (FR-8). Movimento reduzido: valor final direto. */
export function useCountTo(target: number, reduced: boolean) {
  const [shown, setShown] = useState(reduced ? target : 0);
  const from = useRef(reduced ? target : 0);
  useEffect(() => {
    if (reduced) {
      from.current = target;
      setShown(target);
      return;
    }
    const start = from.current;
    const steps = Math.max(1, Math.abs(target - start) * 14);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      const v = i >= steps ? target : start + (target - start) * (i / steps);
      from.current = v;
      setShown(Math.round(v));
      if (i >= steps) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [target, reduced]);
  return shown;
}

export interface RewardStatProps {
  /** Título pequeno ("Seu Pro grátis"); também nomeia a região */
  label: string;
  /** Meses ganhos (conta a partir de 0 na abertura e a cada mudança) */
  months: number;
  unitOne: string;
  unitMany: string;
  /** "Pro grátis até 3 de dezembro de 2026" ou "Crédito para as suas próximas cobranças" (mostrado se months > 0) */
  untilText?: string;
  /** Barra de dias restantes (só Free); `daysLeftText` = "Faltam 61 dias de Pro grátis" */
  days?: { left: number; total: number; text: string };
  /** Texto do estado vazio (months = 0) */
  emptyText: string;
  historyTitle: string;
  history: ReadonlyArray<{ id: string; title: string; detail: string }>;
  historyEmpty: string;
  /** Nota por plano, rodapé */
  note: string;
  /** Momento da recompensa (FR-12): borda de marca e pulso duas vezes (1.600 ms) */
  pulse?: boolean;
  /** Carregando (esqueleto); texto só para leitor de tela */
  loadingLabel?: string;
}

/** RewardStat (F18 FR-8): cartão "Seu Pro grátis" com total animado, barra de dias (`fillx` 900 ms), últimas recompensas e nota. */
export function RewardStat({ label, months, unitOne, unitMany, untilText, days, emptyText, historyTitle, history, historyEmpty, note, pulse, loadingLabel }: RewardStatProps) {
  const reduced = useReducedMotion();
  const shown = useCountTo(months, reduced);
  const eyebrow = 'text-xs font-bold uppercase tracking-[0.12em] text-muted';
  if (loadingLabel) {
    return (
      <aside aria-label={label} className="flex flex-col gap-[18px] rounded-[34px] border-[1.5px] border-border bg-surface p-7">
        <SkeletonRegion label={loadingLabel}>
          <div className="flex flex-col gap-4"><SkeletonBlock width={120} height={14} /><SkeletonBlock width={110} height={72} radius={16} /><SkeletonBlock height={14} /><SkeletonBlock height={10} radius={5} /></div>
        </SkeletonRegion>
      </aside>
    );
  }
  return (
    <aside aria-label={label} style={pulse ? { animation: 'ring 1.6s ease-out 2' } : undefined} className={['flex flex-col gap-[18px] rounded-[34px] border-[1.5px] bg-surface p-7 shadow-[0_22px_56px_rgba(36,26,92,0.1)]', pulse ? 'border-primary' : 'border-border'].join(' ')}>
      <span className={eyebrow}>{label}</span>
      <span className="flex items-baseline gap-2.5">
        <span aria-hidden="true" data-testid="reward-months" className="font-display text-[84px] font-extrabold leading-[0.95] tracking-[-0.05em] text-primary-deep tabular-nums">{shown}</span>
        <span className="sr-only">{months}</span>
        <span className="text-xl font-bold text-muted">{months === 1 ? unitOne : unitMany}</span>
      </span>
      {months > 0 ? (
        <div className="flex flex-col gap-2.5">
          {untilText ? <span className="text-base font-bold">{untilText}</span> : null}
          {days ? (
            <>
              <span aria-hidden="true" className="block h-2.5 overflow-hidden rounded-[5px] bg-divider">
                <span className="fillx block h-2.5 rounded-[5px] bg-primary" style={{ width: `${Math.min(100, Math.round((days.left * 100) / Math.max(days.total, 1)))}%` }} />
              </span>
              <span className="text-[13px] text-muted">{days.text}</span>
            </>
          ) : null}
        </div>
      ) : (
        <p className="m-0 text-[15px] leading-normal text-muted">{emptyText}</p>
      )}
      <div className="flex flex-col gap-0.5 border-t border-divider pt-1.5">
        <span className={`${eyebrow} mb-1.5 mt-2.5`}>{historyTitle}</span>
        {history.length ? (
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {history.map((h, i) => (
              <li key={h.id} className="slide flex items-center gap-3 py-2" style={{ animationDelay: `${i * 90}ms` }}>
                <span aria-hidden="true" className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary-deep">
                  <Icon name="gift" size={18} />
                </span>
                <span className="flex flex-col leading-snug"><span className="text-sm font-bold">{h.title}</span><span className="text-[13px] text-muted">{h.detail}</span></span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-muted">{historyEmpty}</span>
        )}
      </div>
      <span className="text-[12.5px] leading-normal text-muted">{note}</span>
    </aside>
  );
}
