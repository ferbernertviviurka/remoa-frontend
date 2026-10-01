import type { ReactNode } from 'react';

/** Estado vazio: título, descrição e uma ação opcional. `heading` torna o título o h1 da página. */
export function Empty({ title, description, action, heading = false }: { title: string; description?: string; action?: ReactNode; heading?: boolean }) {
  const Title = heading ? 'h1' : 'p';
  return (
    <div className="flex flex-col items-start gap-3 rounded-review border border-dashed border-border bg-surface px-6 py-8 shadow-card">
      <div className="h-10 w-10 rounded-pill bg-primary-tint" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <Title className="font-display text-2xl font-extrabold text-text">{title}</Title>
        {description ? <p className="max-w-sm text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
