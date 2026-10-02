'use client';

// F17 T7: read-only card node for the shared board canvas.
// Simple box: title + front text (truncated). Images use SharedBoard.assets URLs.
// No CanvasContext, no handle ports, no edit buttons.
import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { SharedCard } from '@remoa/contracts';

type NodeData = { card: SharedCard };

function frontText(card: SharedCard): string | null {
  if (card.type === 'concept' || card.type === 'note') return card.front ?? null;
  return null;
}

/** Minimal card box for the public shared view. Matches the NodeCard look approximately. */
export const SharedCardNode = memo(function SharedCardNode({ data }: NodeProps) {
  const { card } = data as NodeData;
  const text = frontText(card);

  return (
    <div
      className="flex flex-col gap-1 rounded-[18px] border border-border bg-surface p-4 text-sm shadow-sm select-none"
      style={{ width: '100%', height: '100%' }}
      data-testid={`shared-card-${card.id}`}
    >
      <p className="m-0 line-clamp-2 font-bold text-ink">{card.title}</p>
      {text ? (
        <p className="m-0 line-clamp-3 text-muted">{text}</p>
      ) : null}
    </div>
  );
});
