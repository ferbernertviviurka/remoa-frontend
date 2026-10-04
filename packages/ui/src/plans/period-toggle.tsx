import type { ReactNode } from 'react';
import { focusRing } from '../button-styles';

/**
 * PeriodToggle (F15 FR-2): Mensal/Anual com marcador branco que desliza (`transform` 400 ms). Grupo de botões com `aria-pressed`.
 * Todos os textos por props; `discountLabel` (ex.: "-25%") vem do contrato, nunca digitado. Sem movimento: `data-motion="reduced"` / prefers-reduced-motion.
 */
export type PeriodToggleProps = {
  'aria-label': string;
  value: 'monthly' | 'annual';
  onValueChange: (v: 'monthly' | 'annual') => void;
  monthlyLabel: string;
  annualLabel: string;
  discountLabel?: ReactNode;
};

export function PeriodToggle({ value, onValueChange, monthlyLabel, annualLabel, discountLabel, ...rest }: PeriodToggleProps) {
  const annual = value === 'annual';
  const btn = `relative flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[15px] text-[15px] font-bold transition-colors duration-200 ${focusRing}`;
  return (
    <div role="group" aria-label={rest['aria-label']} className="relative flex h-[58px] w-80 max-w-full shrink-0 rounded-[19px] bg-track p-1">
      <span
        aria-hidden="true"
        data-testid="period-thumb"
        className="absolute left-1 top-1 h-[50px] w-[calc(50%-4px)] rounded-[15px] bg-surface shadow-[0_6px_16px_rgba(36,26,92,.14)]"
        style={{ transform: `translateX(${annual ? '100%' : '0'})`, transition: 'transform .4s cubic-bezier(.22,1,.36,1)' }}
      />
      <button type="button" aria-pressed={!annual} onClick={() => onValueChange('monthly')} className={`${btn} ${annual ? 'text-muted' : 'text-primary-deep'}`}>
        {monthlyLabel}
      </button>
      <button type="button" aria-pressed={annual} onClick={() => onValueChange('annual')} className={`${btn} ${annual ? 'text-primary-deep' : 'text-muted'}`}>
        {annualLabel}
        {discountLabel ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">{discountLabel}</span> : null}
      </button>
    </div>
  );
}
