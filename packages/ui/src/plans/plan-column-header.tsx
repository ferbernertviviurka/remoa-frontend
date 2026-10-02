import type { ReactNode } from 'react';

/**
 * PlanColumnHeader (F15 FR-4): cartão de cabeçalho da coluna. `plan="free"` = branco com borda; `plan="pro"` = escuro (`panel-dark`).
 * `price` é slot (no Pro, passe o preço animado/TextMorph); `per` é o sufixo ("/mês"); `chip` = "Seu plano atual" / "Recomendado".
 */
export type PlanColumnHeaderProps = { plan: 'free' | 'pro'; name: string; price: ReactNode; per?: ReactNode; chip?: ReactNode };

export function PlanColumnHeader({ plan, name, price, per, chip }: PlanColumnHeaderProps) {
  const pro = plan === 'pro';
  return (
    <div className={`flex h-full flex-col gap-1.5 rounded-[22px] p-[18px] text-left ${pro ? 'bg-panel-dark text-white' : 'border-[1.5px] border-divider bg-surface text-ink'}`}>
      <span className="font-display text-[28px] font-extrabold leading-none tracking-[-0.03em]">{name}</span>
      <span className="flex items-baseline gap-1">
        <span className={`font-display text-xl font-bold leading-[30px] tabular-nums ${pro ? '' : 'text-muted'}`}>{price}</span>
        {per ? <span className={`text-[13px] font-normal ${pro ? 'text-white/80' : 'text-muted'}`}>{per}</span> : null}
      </span>
      {chip ? <span className={`self-start rounded-full px-2.5 py-1 text-xs font-bold ${pro ? 'bg-white text-panel-dark' : 'bg-track text-ink-2'}`}>{chip}</span> : null}
    </div>
  );
}
