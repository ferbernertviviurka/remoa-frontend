import { stateVar, type MapState } from './state';

/**
 * GraphPreview (v2): quadro da prévia do grafo, largura 100%, `height` 120 px (Hoje) ou 132 (Meus mapas), raio 18, fundo --primary-tint com pontos de 16 px.
 * `preview.nodes` com x/y em 0..1 (centro do nó), `preview.edges` pares de índices. Nós = 24 × 15 raio 5 na cor do estado ("sem revisões" = --state-unknown-soft);
 * conexões = linhas de 2 px em --preview-edge. Área útil 254 × 112 centralizada. Decorativo (aria-hidden) salvo se `label` vier (role=img).
 * Sem nós: contorno tracejado.
 */
export type GraphPreviewProps = {
  preview: { nodes: ReadonlyArray<{ x: number; y: number; state: MapState }>; edges: ReadonlyArray<readonly [number, number]> };
  label?: string;
  height?: 120 | 132;
};

const W = 254;
const H = 112;
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const fill = (s: MapState) => (s === 'unknown' ? 'var(--state-unknown-soft)' : stateVar[s]);

export function GraphPreview({ preview, label, height = 120 }: GraphPreviewProps) {
  const a11y = label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': true as const };
  const pos = preview.nodes.map((n) => ({ cx: 12 + clamp(n.x) * (W - 24), cy: 7.5 + clamp(n.y) * (H - 15), state: n.state }));
  return (
    <div
      {...a11y}
      style={{ height, backgroundImage: 'radial-gradient(var(--border-strong) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
      className="relative flex w-full items-center justify-center overflow-hidden rounded-[18px] bg-primary-tint"
    >
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
        {pos.length === 0 ? (
          <rect data-testid="graph-empty" x="1" y="1" width={W - 2} height={H - 2} rx="14" fill="none" strokeWidth="1.5" strokeDasharray="4 4" style={{ stroke: 'var(--border-strong)' }} />
        ) : (
          <>
            {preview.edges.map(([a, b]) => {
              const p = pos[a];
              const q = pos[b];
              return p && q ? <line key={`${a}-${b}`} x1={p.cx} y1={p.cy} x2={q.cx} y2={q.cy} strokeWidth="2" style={{ stroke: 'var(--preview-edge)' }} /> : null;
            })}
            {pos.map((p, i) => (
              <rect key={i} x={p.cx - 12} y={p.cy - 7.5} width="24" height="15" rx="5" style={{ fill: fill(p.state) }} />
            ))}
          </>
        )}
      </svg>
    </div>
  );
}
