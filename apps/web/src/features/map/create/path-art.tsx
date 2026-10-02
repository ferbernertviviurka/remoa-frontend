import type { Path } from './map-preview';

/** Decorative scene per path (aria-hidden). viewBox 480×260; the hub sits at x150..330, y82..178 and the live card overlays it when `live`. */
const SAT_W = 110;
const SAT_H = 40;
const SATS = [
  { x: 100, y: 12, a: [185, 82], b: [155, 52] },
  { x: 340, y: 12, a: [295, 82], b: [380, 52] },
  { x: 340, y: 208, a: [295, 178], b: [380, 208] },
  { x: 110, y: 208, a: [185, 178], b: [165, 208] },
  { x: 10, y: 110, a: [150, 130], b: [120, 130] },
  { x: 360, y: 110, a: [330, 130], b: [360, 130] },
] as const;
const COUNT: Record<Path, number> = { pdf: 4, anki: 4, seed: 6, blank: 4 };

// Motion: only on mount/switch (the svg group is keyed by path). Same reduced-motion rule as tokens.css `.pop`.
const CSS = `
@keyframes art-in{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}
@keyframes art-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
.art-in{transform-box:fill-box;transform-origin:center;animation:art-in .5s cubic-bezier(.22,1,.36,1) both;animation-delay:var(--d,0s)}
.art-draw{stroke-dasharray:1;animation:art-draw .6s ease-out both;animation-delay:var(--d,0s)}
@media (prefers-reduced-motion:reduce){:root:not([data-motion="full"]) .art-in,:root:not([data-motion="full"]) .art-draw{animation:none}}
`;

const d = (s: number) => ({ '--d': `${s}s` }) as React.CSSProperties;

function Sat({ i, path }: { i: number; path: Path }) {
  const { x, y } = SATS[i]!;
  const dashed = path === 'pdf' || path === 'blank';
  return (
    <g className="art-in" style={d(0.25 + i * 0.08)}>
      <rect x={x} y={y} width={SAT_W} height={SAT_H} rx={12} className={dashed ? 'fill-transparent stroke-white/55' : 'fill-white/10 stroke-white/30'} strokeWidth={1.5} strokeDasharray={dashed ? '5 4' : undefined} />
      {path === 'blank' ? (
        <path d={`M${x + SAT_W / 2 - 6} ${y + SAT_H / 2}h12M${x + SAT_W / 2} ${y + SAT_H / 2 - 6}v12`} className="stroke-white/70" strokeWidth={2} strokeLinecap="round" />
      ) : (
        <>
          <rect x={x + 12} y={y + 9} width={34} height={5} rx={2.5} className="fill-white/45" />
          <rect x={x + 12} y={y + 21} width={SAT_W - 44} height={7} rx={3.5} className="fill-white/80" />
        </>
      )}
      {path === 'anki' && i === 3 ? <rect x={x + SAT_W - 40} y={y + 8} width={28} height={24} rx={5} className="fill-primary" /> : null}
      {path === 'seed' ? (
        <g>
          <circle cx={x + SAT_W - 10} cy={y + 8} r={8} className="fill-steady-on-dark" />
          <path d={`M${x + SAT_W - 14} ${y + 8}l3 3 5-6`} className="fill-none stroke-panel-dark" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : null}
    </g>
  );
}

function Source({ path }: { path: Path }) {
  if (path === 'pdf')
    return (
      <g className="art-in" style={d(0)}>
        <path d="M14 92h42l20 20v58a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8v-70a8 8 0 0 1 8-8z" transform="translate(4 0)" className="fill-white/10 stroke-white/50" strokeWidth={1.5} />
        {[126, 138, 150].map((y, k) => <rect key={y} x={24} y={y} width={k === 2 ? 24 : 42} height={5} rx={2.5} className="fill-white/60" />)}
      </g>
    );
  if (path === 'anki')
    return (
      <g className="art-in" style={d(0)}>
        {[[-9, 0.25], [0, 0.45], [9, 0.9]].map(([r, o]) => (
          <rect key={r} x={14} y={96} width={52} height={68} rx={8} transform={`rotate(${r} 40 130)`} className="fill-panel-dark stroke-white" strokeOpacity={o} strokeWidth={1.5} />
        ))}
        <rect x={24} y={118} width={32} height={6} rx={3} className="fill-white/70" />
        <rect x={24} y={132} width={22} height={6} rx={3} className="fill-white/45" />
      </g>
    );
  return null;
}

export function PathArt({ path, live, className }: { path: Path; live?: { name: string; area: string; item: string }; className?: string }) {
  const sats = Array.from({ length: COUNT[path] }, (_, i) => i);
  const hasSource = path === 'pdf' || path === 'anki';
  const dashed = path === 'pdf' || path === 'blank';
  return (
    <div aria-hidden="true" className={`relative aspect-[480/260] w-full ${className ?? ''}`}>
      {live ? (
        <div className="absolute left-[31.25%] top-[31.5%] flex h-[36.9%] w-[37.5%] flex-col justify-center gap-0.5 rounded-[20px] bg-surface px-4 py-3 text-ink shadow-[0_18px_40px_rgba(0,0,0,.28)]">
          <span className="truncate text-[11px] font-bold uppercase tracking-[.1em] text-muted">{live.area}</span>
          <span className="line-clamp-2 font-display text-[17px] font-bold leading-[1.15] tracking-[-0.02em]">{live.name}</span>
          {live.item && live.item !== live.name ? <span className="truncate text-xs text-muted">{live.item}</span> : null}
        </div>
      ) : null}
      <svg viewBox="0 0 480 260" className="absolute inset-0 size-full overflow-visible">
        <style>{CSS}</style>
        <g key={path}>
          {sats.map((i) => {
            const { a, b } = SATS[i]!;
            return dashed ? (
              <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="art-in stroke-white/35" style={d(0.15 + i * 0.08)} strokeWidth={2} strokeDasharray="5 5" />
            ) : (
              <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} pathLength={1} className="art-draw stroke-white/30" style={d(0.1 + i * 0.08)} strokeWidth={2} />
            );
          })}
          {hasSource ? <line x1={80} y1={130} x2={150} y2={130} pathLength={dashed ? undefined : 1} className={dashed ? 'art-in stroke-white/50' : 'art-draw stroke-white/50'} strokeWidth={2} strokeDasharray={dashed ? '5 5' : undefined} style={d(0.1)} /> : null}
          <Source path={path} />
          {live ? null : (
            <g className="art-in" style={d(0.05)}>
              <rect x={150} y={82} width={180} height={96} rx={20} className="fill-surface" />
              <rect x={170} y={108} width={60} height={7} rx={3.5} className="fill-divider" />
              <rect x={170} y={124} width={110} height={12} rx={6} className="fill-primary-tint" />
              <rect x={170} y={148} width={80} height={7} rx={3.5} className="fill-divider" />
            </g>
          )}
          {sats.map((i) => <Sat key={i} i={i} path={path} />)}
          {path === 'seed' ? (
            <g className="art-in" style={d(0.7)}>
              <circle cx={326} cy={82} r={15} className="fill-steady-on-dark stroke-panel-dark" strokeWidth={3} />
              <path d="M319 82l5 5 9-10" className="fill-none stroke-panel-dark" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ) : null}
        </g>
      </svg>
    </div>
  );
}
