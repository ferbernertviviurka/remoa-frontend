/**
 * SegmentBar: barra segmentada de composição (20 px, raio 10, trilho --divider). Cada `segments[i]` = { id, value, color (css, ex.: 'var(--state-review-border)') }.
 * `flex-grow` anima em 500 ms ao mudar os valores (exceção consciente à regra transform/opacity: é o movimento do mock FR-3).
 * Entrada com `.fillx`. `summary` obrigatório (role=img). Total 0 = só o trilho.
 */
export type SegmentBarProps = { segments: ReadonlyArray<{ id: string; value: number; color: string }>; summary: string; height?: number };

export function SegmentBar({ segments, summary, height = 20 }: SegmentBarProps) {
  return (
    <div role="img" aria-label={summary} className="flex overflow-hidden bg-divider" style={{ height, borderRadius: height / 2 }}>
      {segments.filter((s) => s.value > 0).map((s) => (
        <span key={s.id} data-segment={s.id} className="fillx h-full" style={{ flexGrow: s.value, flexBasis: 0, background: s.color, transition: 'flex-grow .5s cubic-bezier(.22,1,.36,1)' }} />
      ))}
    </div>
  );
}
