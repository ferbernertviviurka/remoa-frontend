import type { ReactNode } from 'react';
import { Card } from '@remoa/ui';

export function EmptyState({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <Card>
      <div className="flex flex-col items-start gap-3">
        <h1 className="font-display text-2xl font-extrabold text-text">{title}</h1>
        <p className="text-sm text-muted">{body}</p>
        {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
      </div>
    </Card>
  );
}
