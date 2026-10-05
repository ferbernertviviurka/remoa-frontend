import { notFound } from 'next/navigation';
import type { BoardGraph } from '@remoa/contracts';
import { serverApi } from '@/lib/api/server';
import { MapSurface } from '@/features/map/canvas/map-surface';

export default async function MapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await serverApi<BoardGraph>(`/v1/boards/${encodeURIComponent(id)}`);
  if (!r.ok) {
    if (r.error.code === 'not_found' || r.error.code === 'validation') notFound();
    throw new Error(r.error.message);
  }
  return <MapSurface graph={r.data} />;
}
