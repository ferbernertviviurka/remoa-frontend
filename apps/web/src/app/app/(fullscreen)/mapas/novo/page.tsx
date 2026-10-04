import type { Metadata } from 'next';
import type { MatrixItem } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { parseInitial } from '@/features/map/create/map-preview';
import { NewMapView } from '@/features/map/create/new-map-view';
import { serverApi } from '@/lib/api/server';

export const metadata: Metadata = { title: t('pages.newMap') };

// Tela cheia, sem trilho (D-079): fica fora do layout (app).
export default async function Page({ searchParams }: { searchParams: Promise<{ caminho?: string; item?: string }> }) {
  const { caminho, item } = await searchParams;
  const r = await serverApi<MatrixItem[]>('/v1/matrix/items?area=CM');
  const all = r.ok ? r.data : [];
  // F07: groups (items with children) are headings, not link targets.
  const items = all.filter((i) => !all.some((c) => c.parentId === i.id));
  const init = parseInitial(caminho, item, items);
  return <NewMapView items={items} initialPath={init.path} initialItemId={init.itemId} initialStep={init.step} />;
}
