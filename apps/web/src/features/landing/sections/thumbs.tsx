// Decorative thumbnails (aria-hidden) for Problema and Como funciona, after the mock.
const pill = 'rounded-full bg-border px-3 py-[3px] text-xs font-bold text-muted';
const bar = 'block rounded bg-border';
const miniCard = 'absolute h-16 w-[84px] rounded-[14px] border-[1.5px] border-border-strong bg-surface';

function MiniCard({ left, top, rot }: { left: number; top: number; rot: number }) {
  return (
    <span className={miniCard} style={{ left, top, transform: `rotate(${rot}deg)` }}>
      <span className="absolute top-3 left-2.5 h-[7px] w-[34px] rounded bg-border-strong" />
      <span className="absolute top-7 left-2.5 h-1.5 w-14 rounded bg-border" />
    </span>
  );
}

export function LooseCardsThumb({ chip }: { chip: string }) {
  return (
    <div aria-hidden="true" className="relative h-[150px] overflow-hidden rounded-[22px] bg-canvas">
      <MiniCard left={22} top={20} rot={-6} />
      <MiniCard left={118} top={56} rot={5} />
      <MiniCard left={208} top={14} rot={-3} />
      <span className={`${pill} absolute bottom-3 left-1/2 -translate-x-1/2`}>{chip}</span>
    </div>
  );
}

export function RepeatThumb({ chip }: { chip: string }) {
  return (
    <div aria-hidden="true" className="flex h-[150px] flex-col gap-2 overflow-hidden rounded-[22px] bg-canvas px-5 py-[18px]">
      {[180, 140, 160].map((w) => (
        <span key={w} className="flex items-center gap-2.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted"><path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" /></svg>
          <span className={`${bar} h-2.5`} style={{ width: w }} />
        </span>
      ))}
      <span className={`${pill} mt-auto self-start`}>{chip}</span>
    </div>
  );
}

export function CoverageThumb({ chip }: { chip: string }) {
  return (
    <div aria-hidden="true" className="flex h-[150px] flex-col gap-2.5 overflow-hidden rounded-[22px] bg-canvas px-5 py-[18px]">
      {[70, 40, 20, 8].map((w) => (
        <span key={w} className="block h-3 rounded-md border-[1.5px] border-dashed border-border-strong">
          <span className="block h-[9px] rounded bg-border-strong opacity-55" style={{ width: `${w}%` }} />
        </span>
      ))}
      <span className={`${pill} mt-auto self-start`}>{chip}</span>
    </div>
  );
}

const node = 'absolute h-16 w-28 rounded-[14px] border-2 bg-surface';
export function ConnectThumb() {
  return (
    <div aria-hidden="true" className="relative h-full" style={{ backgroundImage: 'radial-gradient(var(--color-border-strong, #D9D4F0) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
      <span className={`${node} border-primary`} style={{ left: 20, top: 34 }}>
        <span className="absolute top-3.5 left-3 h-2 w-12 rounded bg-ink" />
        <span className={`${bar} absolute top-8 left-3 h-1.5 w-[70px]`} />
      </span>
      <span className={`${node} border-primary`} style={{ left: 210, top: 92 }}>
        <span className="absolute top-3.5 left-3 h-2 w-[52px] rounded bg-ink" />
        <span className={`${bar} absolute top-8 left-3 h-1.5 w-[60px]`} />
      </span>
      <svg width="1" height="1" className="absolute top-0 left-0 overflow-visible"><path d="M132 66H170Q176 66 176 72V118Q176 124 182 124H210" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted" /></svg>
    </div>
  );
}

export function ReviewThumb() {
  return (
    <div aria-hidden="true" className="flex h-full flex-col gap-2.5 bg-panel-dark p-[18px]">
      <span className="h-2.5 w-[70%] rounded bg-on-dark-muted-2" />
      <span className="h-2.5 w-[46%] rounded bg-on-dark-muted-2 opacity-60" />
      <span className="flex h-8 items-center gap-2.5 rounded-xl border-[1.5px] border-white/20 px-3"><span className="size-4 rounded-full bg-white/25" /><span className="h-[7px] w-[150px] rounded bg-white opacity-80" /></span>
      <span className="flex h-8 items-center gap-2.5 rounded-xl border-[1.5px] border-on-dark-muted bg-white/15 px-3"><span className="size-4 rounded-full bg-on-dark-muted" /><span className="h-[7px] w-[120px] rounded bg-white" /></span>
    </div>
  );
}

export function EvolveThumb() {
  const heat = ['bg-primary', 'bg-primary/60', 'bg-border-strong', 'bg-primary/80', 'bg-border', 'bg-primary/40', 'bg-primary', 'bg-border-strong'];
  return (
    <div aria-hidden="true" className="grid h-full grid-cols-4 content-center gap-2.5 p-5">
      {heat.map((c, i) => <span key={i} className={`h-[70px] rounded-xl ${c}`} />)}
    </div>
  );
}
