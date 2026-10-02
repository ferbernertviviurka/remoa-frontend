import { clsx } from 'clsx';
import type { MapState } from './state';

/**
 * Constellation: o mapa vivo do Hoje, 380 × 300, sobre fundo escuro (usa os estados "on-dark"). Decorativa (aria-hidden):
 * a informação equivalente está no texto do Hero.
 * `nodes[i]`: { x, y } = CENTRO em px dentro de 380 × 300, `size` = diâmetro (12–26), `state`, `label?` (nome do mapa, 13 px/600),
 * `labelSide` = right (padrão) | left, `pulse` = anel pulsante laranja (só em nó vencido; some com prefers-reduced-motion).
 * `edges`: pares de índices; linha de 2 px a 22% de branco.
 */
export type ConstellationNode = { x: number; y: number; size: number; state: MapState; label?: string; labelSide?: 'right' | 'left'; pulse?: boolean };
export type ConstellationProps = { nodes: readonly ConstellationNode[]; edges: ReadonlyArray<readonly [number, number]> };

const onDark: Record<MapState, string> = {
  review: 'bg-review-on-dark',
  watch: 'bg-watch-on-dark',
  steady: 'bg-steady-on-dark',
  unknown: 'bg-unknown-on-dark',
};

export function Constellation({ nodes, edges }: ConstellationProps) {
  return (
    <div aria-hidden="true" className="relative h-[300px] w-[380px] shrink-0">
      <svg width="380" height="300" className="absolute inset-0">
        {edges.map(([a, b]) => {
          const p = nodes[a];
          const q = nodes[b];
          return p && q ? <line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} strokeWidth="2" style={{ stroke: 'var(--on-dark-line)' }} /> : null;
        })}
      </svg>
      {nodes.map((n, i) => (
        <span key={i}>
          <span
            data-state={n.state}
            className={clsx('absolute rounded-full', onDark[n.state], n.pulse && 'pulsed')}
            style={{ left: n.x - n.size / 2, top: n.y - n.size / 2, width: n.size, height: n.size }}
          />
          {n.label ? (
            <span
              className="absolute whitespace-nowrap text-[13px] font-semibold text-on-dark-muted-2"
              style={{
                top: n.y,
                transform: 'translateY(-50%)',
                ...(n.labelSide === 'left' ? { right: 380 - (n.x - n.size / 2 - 9) } : { left: n.x + n.size / 2 + 9 }),
              }}
            >
              {n.label}
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}
