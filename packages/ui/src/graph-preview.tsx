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

/** Até este número de nós a miniatura mantém as pílulas 24 × 15; acima, vira constelação (D-338). */
const FULL_MAX = 12;
/**
 * Tamanho de cada nó: pílula cheia até FULL_MAX nós; depois a largura cai com 1/raiz(n) (mín. 5) e hubs (grau >= 4) ficam 60% maiores.
 * Pura: o teste cobre. `constellation` também afina as linhas.
 */
export function previewSizes(count: number, edges: ReadonlyArray<readonly [number, number]>) {
  const constellation = count > FULL_MAX;
  const base = constellation ? Math.max(5, 24 * Math.sqrt(FULL_MAX / count)) : 24;
  const degree = new Array<number>(count).fill(0);
  for (const [a, b] of edges) {
    if (a < count) degree[a]! += 1;
    if (b < count) degree[b]! += 1;
  }
  const sizes = degree.map((d) => {
    const w = constellation && d >= 4 ? base * 1.6 : base;
    return { w, h: w * 0.625 };
  });
  return { sizes, constellation };
}

export function GraphPreview({ preview, label, height = 120 }: GraphPreviewProps) {
  const a11y = label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': true as const };
  const pos = preview.nodes.map((n) => ({ cx: 12 + clamp(n.x) * (W - 24), cy: 7.5 + clamp(n.y) * (H - 15), state: n.state }));
  const { sizes, constellation } = previewSizes(pos.length, preview.edges);
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
              return p && q ? <line key={`${a}-${b}`} x1={p.cx} y1={p.cy} x2={q.cx} y2={q.cy} strokeWidth={constellation ? 1 : 2} style={{ stroke: 'var(--preview-edge)' }} /> : null;
            })}
            {pos.map((p, i) => (
              <rect key={i} x={p.cx - sizes[i]!.w / 2} y={p.cy - sizes[i]!.h / 2} width={sizes[i]!.w} height={sizes[i]!.h} rx={Math.min(5, sizes[i]!.h / 2)} style={{ fill: fill(p.state) }} />
            ))}
          </>
        )}
      </svg>
    </div>
  );
}
