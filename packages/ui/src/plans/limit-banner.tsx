import type { ReactNode } from 'react';

/** LimitBanner (F15 FR-3): faixa laranja de limite (`role="status"`, entra com `slide`). `children` = texto; `action` = slot do link ("Ver o resumo", alvo ≥ 44 px). */
export function LimitBanner({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div role="status" className="slide flex items-center gap-3.5 rounded-[20px] border-[1.5px] border-review bg-review-bg px-[18px] py-3.5 text-review-text">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
        <rect x="5" y="11" width="14" height="10" rx="3" />
        <path d="M8 11V8a4 4 0 018 0v3" />
      </svg>
      <span className="grow font-semibold leading-[19px]">{children}</span>
      {action ? <span className="flex min-h-11 items-center font-bold underline [&_a]:flex [&_a]:h-11 [&_a]:items-center">{action}</span> : null}
    </div>
  );
}
