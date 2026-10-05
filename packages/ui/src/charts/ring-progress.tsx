import type { ReactNode } from 'react';

/**
 * RingProgress: anel grande do painel da fila (236 px, raio 100, traço 16, ponta redonda, começa às 12h, se preenche em 1,4 s).
 * Cores sobre painel escuro: trilho --on-dark-line, traço --state-steady-on-dark. `value`/`max` (max > 0).
 * `label` obrigatório (resumo, ex.: "3 de 15 revisados hoje"): o svg é role=img. `children` = conteúdo central (número, texto, check).
 * Movimento reduzido: aparece cheio direto (keyframe só tem `from`).
 */
export type RingProgressProps = { value: number; max: number; label: string; size?: number; children?: ReactNode };

const R = 100;
const C = 2 * Math.PI * R;

export function RingProgress({ value, max, label, size = 236, children }: RingProgressProps) {
  const frac = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const len = C * frac;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 236 236" fill="none" role="img" aria-label={label}>
        <g transform="rotate(-90 118 118)">
          <circle cx="118" cy="118" r={R} stroke="var(--on-dark-line)" strokeWidth="16" />
          {/* ponta redonda desenha um ponto em 0: sem arco então */}
          {frac > 0 ? (
            <circle data-testid="ring-progress-arc" className="rv-ring" cx="118" cy="118" r={R} stroke="var(--state-steady-on-dark)" strokeWidth="16" strokeLinecap="round" style={{ strokeDasharray: C, strokeDashoffset: C - len, ['--len' as string]: C }} />
          ) : null}
        </g>
      </svg>
      {children ? <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-on-dark">{children}</div> : null}
    </div>
  );
}
