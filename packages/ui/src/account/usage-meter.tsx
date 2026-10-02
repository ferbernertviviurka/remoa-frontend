import type { ReactNode } from 'react';

/**
 * UsageMeter: medidor de uso (rótulo, legenda, valor em texto e barra de 10 px). A barra anima `scaleX` de 0 ao valor
 * em 900 ms (`fillx`). `tone`: normal (primary) | warn (âmbar, ≥ 80%) | danger (laranja, 100%) | unlimited (barra cheia
 * clara; `value` = "Ilimitado"). Quem chama calcula `percent` e `tone`. O valor vai por texto (`value`), a barra é decorativa.
 * `warning` = slot do aviso sob a barra (use `UsageWarning`).
 */
export type UsageTone = 'normal' | 'warn' | 'danger' | 'unlimited';
export type UsageMeterProps = { label: string; sub?: string; value: string; percent: number; tone?: UsageTone; warning?: ReactNode };

const fill: Record<UsageTone, string> = { normal: 'bg-primary', warn: 'bg-watch', danger: 'bg-review', unlimited: 'bg-primary-tint' };

export function UsageMeter({ label, sub, value, percent, tone = 'normal', warning }: UsageMeterProps) {
  const pct = tone === 'unlimited' ? 100 : Math.min(100, Math.max(0, percent));
  const hot = tone === 'warn' || tone === 'danger';
  return (
    <div className="flex flex-col gap-2 border-t border-divider py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex flex-col leading-snug">
          <span className="text-base font-bold text-ink">{label}</span>
          {sub ? <span className="text-[13px] text-muted">{sub}</span> : null}
        </span>
        <span className={`font-display text-xl font-extrabold ${hot ? 'text-watch-text' : 'text-ink'}`}>{value}</span>
      </div>
      <span aria-hidden="true" className="block h-2.5 overflow-hidden rounded-[5px] bg-divider">
        <span data-testid="usage-fill" className={`fillx block h-2.5 w-full rounded-[5px] ${fill[tone]}`} style={{ transform: `scaleX(${pct / 100})` }} />
      </span>
      {warning}
    </div>
  );
}

/** Aviso do medidor: ícone, texto e ação opcional (ex.: "Ver o Pro"). */
export function UsageWarning({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <span role="status" className="flex flex-wrap items-center gap-2.5 text-sm font-semibold text-watch-text">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 4l9 16H3z" />
        <path d="M12 10v4M12 17h.01" />
      </svg>
      {children}
      {action}
    </span>
  );
}
