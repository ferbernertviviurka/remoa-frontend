import type { ReactNode } from 'react';
import { Empty } from '@remoa/ui';

export function EmptyState({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return <Empty heading title={title} description={body} action={children} />;
}
