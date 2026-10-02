import { t, type StringKey } from '@remoa/strings';

export type Path = 'pdf' | 'anki' | 'seed' | 'blank';

/** Server-safe (a Server Component calls it: do not move into a 'use client' file). */
export function parsePath(v: string | undefined): Path {
  return v === 'pdf' || v === 'anki' || v === 'blank' ? v : v === 'pronto' || v === 'seed' ? 'seed' : 'blank';
}

/** Mock scene: 520 px wide (aside 600 − 2 × 40 padding). Satellites keep the mock's y and spread x over the scene so none bleeds off the edge (the mock clipped the right ones). */
const W = 520;
const NODE_W = 140;
const SAT = [[20, 24], [440, 8], [8, 330], [452, 322], [230, 372]] as const;
const MOCK_MAX_X = 452;
const CX = 260;
const CY = 220;

const LABELS: Record<Path, ReadonlyArray<readonly [string, string]>> = {
  pdf: [['concept', 'definition'], ['flow', 'conduct'], ['concept', 'criteria'], ['case', 'case1'], ['image', 'figure']],
  anki: [['ankiCard', 'definition'], ['ankiCard', 'treatment'], ['image', 'occlusion'], ['ankiCard', 'diagnosis'], ['ankiCard', 'exams']],
  seed: [['concept', 'definition'], ['flow', 'conduct'], ['concept', 'criteria'], ['case', 'case1'], ['image', 'figure']],
  blank: [],
};

/** Dark live preview (aside). `step` fades the satellites in: 0.55, 0.8, 1. */
export function MapPreview({ path, step, name, area, item }: { path: Path; step: 0 | 1 | 2; name: string; area: string; item: string }) {
  const opacity = [0.55, 0.8, 1][step];
  const ghost = path === 'pdf';
  const sats = LABELS[path].map(([k, v], i) => {
    const [x, y] = SAT[i]!;
    return { left: (x * (W - NODE_W)) / MOCK_MAX_X, top: y, k: t(`newMap.sat.${k}` as StringKey), v: t(`newMap.sat.${v}` as StringKey) };
  });
  return (
    <aside aria-label={t('newMap.previewLabel')} className="hidden w-[600px] shrink-0 flex-col gap-3.5 overflow-hidden bg-panel-dark px-10 pb-9 pt-[38px] text-on-dark lg:flex">
      <span className="text-xs font-bold uppercase tracking-[.12em] text-on-dark-muted">{t('newMap.previewLabel')}</span>
      <span className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.025em]">{name || t('newMap.nameLabel')}</span>
      <span className="text-[15px] text-on-dark-muted-2">{t(`newMap.previewSub.${path}` as StringKey)}{path === 'blank' ? '' : ` · ${item}`}</span>
      <div aria-hidden="true" className="relative min-h-[440px] grow">
        {sats.map((s, i) => (
          <div
            key={i}
            style={{ left: CX, top: CY, width: Math.hypot(s.left + NODE_W / 2 - CX, s.top + 28 - CY), transform: `rotate(${Math.atan2(s.top + 28 - CY, s.left + NODE_W / 2 - CX)}rad)`, opacity }}
            className="absolute h-0.5 origin-left bg-white/25"
          />
        ))}
        <div className="pop absolute left-[160px] top-[176px] flex h-[88px] w-[200px] flex-col justify-center gap-1 rounded-[20px] bg-surface px-4 py-3.5 text-ink shadow-[0_18px_40px_rgba(0,0,0,.28)]">
          <span className="text-[11px] font-bold uppercase tracking-[.1em] text-muted">{area}</span>
          <span className="line-clamp-2 font-display text-[19px] font-bold leading-[1.15] tracking-[-0.02em]">{name || t('newMap.nameLabel')}</span>
        </div>
        {sats.map((s, i) => (
          <div
            key={i}
            style={{ left: s.left, top: s.top, opacity }}
            className={`pop absolute flex h-14 w-[140px] flex-col justify-center rounded-2xl px-3.5 ${ghost ? 'border-[1.5px] border-dashed border-white/55' : 'border-[1.5px] border-white/30 bg-white/10'}`}
          >
            <span className="text-[11px] font-bold uppercase tracking-[.08em] text-on-dark-muted">{s.k}</span>
            <span className="text-sm font-semibold text-on-dark">{s.v}</span>
          </div>
        ))}
      </div>
      <span className="text-sm leading-normal text-on-dark-muted-2">{t(`newMap.previewNote.${path}` as StringKey)}</span>
    </aside>
  );
}
