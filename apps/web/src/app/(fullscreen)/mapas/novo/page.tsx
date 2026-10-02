import type { Metadata } from 'next';
import type { MatrixItem } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { parsePath } from '@/features/map/create/map-preview';
import { NewMapView } from '@/features/map/create/new-map-view';
import { serverApi } from '@/lib/api/server';

export const metadata: Metadata = { title: t('pages.newMap') };

// Tela cheia, sem trilho (D-079): fica fora do layout (app).
export default async function Page({ searchParams }: { searchParams: Promise<{ caminho?: string }> }) {
  const { caminho } = await searchParams;
  const r = await serverApi<MatrixItem[]>('/v1/matrix/items?area=CM');
  return <NewMapView items={r.ok ? r.data : []} initialPath={caminho ? parsePath(caminho) : undefined} />;
}
