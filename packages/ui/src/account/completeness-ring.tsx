'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * CompletenessRing: anel SVG de 136 px (raio 62, traço 6) em volta de um avatar de 108 px (`children`, deslocado 14 px).
 * `value` 0–100; anima `stroke-dasharray` em 900 ms (sem animação com movimento reduzido). `label` = texto do anel
 * ("Perfil 60% completo"); o anel é role=img com ele. Envolva num <button> se o anel for clicável.
 */
export type CompletenessRingProps = { value: number; label: string; children: ReactNode };

const R = 62;
const C = 2 * Math.PI * R; // 389.6

export function CompletenessRing({ value, label, children }: CompletenessRingProps) {
  const target = (C * Math.min(100, Math.max(0, value))) / 100;
  const [dash, setDash] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDash(target));
    return () => cancelAnimationFrame(id);
  }, [target]);
  return (
    <span className="relative block h-[136px] w-[136px] shrink-0">
      <svg width="136" height="136" viewBox="0 0 136 136" role="img" aria-label={label} className="absolute left-0 top-0">
        <circle cx="68" cy="68" r={R} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="6" />
        <circle
          data-testid="completeness-arc"
          className="ring-dash"
          cx="68"
          cy="68"
          r={R}
          fill="none"
          stroke="var(--state-steady-on-dark)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash.toFixed(1)} ${C.toFixed(1)}`}
          transform="rotate(-90 68 68)"
        />
      </svg>
      <span className="absolute left-3.5 top-3.5 block h-[108px] w-[108px]">{children}</span>
    </span>
  );
}
