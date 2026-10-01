/** Número de destaque com rótulo e nota opcional. */
export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-map border border-border bg-surface px-4 py-3 shadow-card">
      <p className="text-[11px] font-bold uppercase tracking-[.13em] text-muted">{label}</p>
      <p className="font-display text-3xl font-extrabold tracking-tight text-text">{value}</p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
