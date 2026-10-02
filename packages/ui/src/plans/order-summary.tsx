import type { ReactNode } from 'react';

/**
 * OrderSummary: cartão do resumo do pedido (sticky no desktop; no celular segue o fluxo). Tudo por slots/props.
 * `price` (nó, ex.: PriceTicker) + `per`, `note` (nota de cobrança), `saving` (chip opcional), `method`, `coupon`, `lines`, `nextBilling`, `action`, `secure`.
 * Linha de totais: `struck` = preço de tabela riscado, com `srLabel` ("preço de tabela") lido por leitor de tela; `strong` = Total hoje.
 */
export type OrderLine = { label: string; value: string; struck?: boolean; srLabel?: string; strong?: boolean; founder?: boolean };
export type OrderSummaryProps = {
  label: string;
  badge: string;
  price: ReactNode;
  per: string;
  note: string;
  saving?: string;
  methodLabel: string;
  method: ReactNode;
  coupon: ReactNode;
  lines: ReadonlyArray<OrderLine>;
  nextBilling: string;
  action: ReactNode;
  secure: string;
  secureIcon?: ReactNode;
};

export function OrderSummary(p: OrderSummaryProps) {
  return (
    <aside aria-label={p.label} className="flex flex-col gap-[18px] rounded-hero border border-border bg-surface p-[26px] shadow-lift min-[1100px]:sticky min-[1100px]:top-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{p.label}</span>
        <span className="rounded-pill bg-panel-dark px-3 py-1 text-[13px] font-bold text-on-dark">{p.badge}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="flex items-baseline gap-1.5">
          <span className="font-display text-[50px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">{p.price}</span>
          <span className="text-base font-semibold text-muted">{p.per}</span>
        </span>
        <span className="text-sm text-muted">{p.note}</span>
      </div>
      {p.saving ? <span className="slide self-start rounded-pill bg-primary-tint px-3 py-1.5 text-[13px] font-bold text-primary-deep">{p.saving}</span> : null}
      <div className="flex flex-col gap-2.5">
        <span className="font-bold">{p.methodLabel}</span>
        {p.method}
      </div>
      {p.coupon}
      <div className="flex flex-col gap-0.5 border-t border-border pt-1.5">
        {p.lines.map((l) => (
          <div key={l.label} className={`flex items-center justify-between py-2 text-[15px] ${l.strong ? 'font-extrabold text-ink' : l.struck ? 'font-semibold text-muted' : l.founder ? 'font-semibold text-primary-deep' : 'font-semibold text-ink'}`}>
            <span>{l.label}</span>
            <span className="tabular-nums">
              {l.struck ? (
                <>
                  {l.srLabel ? <span className="sr-only">{l.srLabel}: </span> : null}
                  <s>{l.value}</s>
                </>
              ) : l.value}
            </span>
          </div>
        ))}
        <span className="text-[13px] text-muted">{p.nextBilling}</span>
      </div>
      {p.action}
      <span className="flex items-center justify-center gap-2 text-center text-[12.5px] leading-[1.4] text-muted">
        {p.secureIcon ? <span aria-hidden="true" className="flex">{p.secureIcon}</span> : null}
        {p.secure}
      </span>
    </aside>
  );
}
