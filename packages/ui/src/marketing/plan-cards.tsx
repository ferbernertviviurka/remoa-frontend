'use client';

import type { ReactNode } from 'react';
import { Reveal } from './reveal';
import { Icon } from '../icons';
import { focusRing } from '../button';

export type PlanCardPeriod = 'monthly' | 'annual';
export type PlanCardPlan = {
  name: string;
  price: { amount: number; currency: 'BRL' };
  /** Ex.: "/mês" ou "/ano". */
  cadence: string;
  description?: string;
  /** Linha sob o preço, anunciada ao mudar (`aria-live="polite"`). */
  note?: string;
  features: string[];
  cta: ReactNode;
  dark?: boolean;
  badge?: string;
};
export type PlanCardsProps = {
  period: PlanCardPeriod;
  onPeriodChange: (p: PlanCardPeriod) => void;
  periodLabels: { monthly: string; annual: string };
  /** Rótulo do grupo do seletor de período. */
  periodGroupLabel: string;
  plans: PlanCardPlan[];
  /** Etiqueta de desconto ao lado de "Anual" (ex.: "−25%"); calculada pelo app. */
  discountLabel?: string;
};

export function formatBRL(amount: number, currency: 'BRL' = 'BRL') {
  const whole = Number.isInteger(amount) && amount === 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(amount);
}

/**
 * Planos da landing: seletor Mensal/Anual com marcador deslizante (400 ms), preço que entra com escala (400 ms, re-chaveado ao trocar o período)
 * e cartão escuro opcional (Pro). Valores vêm do app (PriceBook); nada é fixo aqui. Movimento reduzido: tudo estático.
 */
export function PlanCards({ period, onPeriodChange, periodLabels, periodGroupLabel, plans, discountLabel }: PlanCardsProps) {
  const annual = period === 'annual';
  const opt = (p: PlanCardPeriod, on: boolean) => `relative flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[15px] border-0 bg-transparent text-[15px] font-bold transition-colors duration-[250ms] ${on ? 'text-ink' : 'text-muted'} ${focusRing}`;
  return (
    <div className="flex flex-col gap-8 md:gap-11">
      <div role="group" aria-label={periodGroupLabel} className="relative flex h-[58px] w-full max-w-[320px] shrink-0 self-start rounded-[19px] bg-track p-1 md:self-end">
        <span aria-hidden="true" className={`absolute top-1 left-1 h-[50px] w-[calc(50%-4px)] rounded-[15px] bg-surface shadow-[0_6px_16px_rgba(36,26,92,0.14)] transition-transform duration-[400ms] ease-[cubic-bezier(.22,1,.36,1)] ${annual ? 'translate-x-full' : 'translate-x-0'}`} />
        <button type="button" aria-pressed={!annual} onClick={() => onPeriodChange('monthly')} className={opt('monthly', !annual)}>{periodLabels.monthly}</button>
        <button type="button" aria-pressed={annual} onClick={() => onPeriodChange('annual')} className={opt('annual', annual)}>
          {periodLabels.annual}
          {discountLabel ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-on-primary">{discountLabel}</span> : null}
        </button>
      </div>
      <div className="grid items-stretch gap-7 md:grid-cols-2">
        {plans.map((p, i) => {
          const hid = `plan-${i}-name`;
          return (
            <Reveal key={p.name}>
              <article aria-labelledby={hid} className={`flex h-full flex-col gap-5 rounded-[36px] p-6 md:p-9 ${p.dark ? 'bg-panel-dark text-on-dark shadow-[0_36px_90px_rgba(36,26,92,0.3)]' : 'border-[1.5px] border-border bg-canvas'}`}>
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 id={hid} className="m-0 font-display text-[34px] font-extrabold tracking-[-0.03em]">{p.name}</h3>
                    {p.badge ? <span className="rounded-full bg-surface px-3.5 py-1 text-[13px] font-extrabold text-panel-dark">{p.badge}</span> : null}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span key={`${period}-${p.price.amount}`} className="pop inline-block font-display text-[48px] leading-none font-extrabold tracking-[-0.04em] tabular-nums md:text-[56px]">{formatBRL(p.price.amount, p.price.currency)}</span>
                    <span className={`text-[17px] font-semibold ${p.dark ? 'text-on-dark-muted' : 'text-muted'}`}>{p.cadence}</span>
                  </div>
                  {p.description ? <span className={`text-[15px] ${p.dark ? 'text-on-dark-muted-2' : 'text-muted'}`}>{p.description}</span> : null}
                  {p.note ? <span aria-live="polite" className={`text-[15px] ${p.dark ? 'text-on-dark-muted-2' : 'text-muted'}`}>{p.note}</span> : null}
                </div>
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-base">
                      <span aria-hidden="true" className={`flex size-[26px] shrink-0 items-center justify-center rounded-full ${p.dark ? 'bg-steady-on-dark text-panel-dark' : 'border border-border-strong bg-surface text-primary-deep'}`}><Icon name="check" size={14} /></span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto [&>a]:flex [&>a]:min-h-14 [&>a]:items-center [&>a]:justify-center [&>a]:rounded-field [&>a]:text-[17px] [&>a]:font-extrabold [&>a]:no-underline [&>button]:min-h-14 [&>button]:w-full">{p.cta}</div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
