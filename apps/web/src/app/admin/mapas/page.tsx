import { adminMocks } from '@remoa/contracts/mocks';
import type { AdminMapListQuery, AdminMapPage } from '@remoa/contracts';
import { requireAdmin } from '@/features/admin/shared/api';
import { adminList, flat, pageNumber, unwrap, type ListSearch } from '@/features/admin/list-kit/server';
import { MapsView } from '@/features/admin/maps/maps-view';

export default async function Page({ searchParams }: { searchParams: Promise<ListSearch> }) {
  await requireAdmin();
  const params = flat(await searchParams);
  const { data, error } = unwrap(await adminList<AdminMapPage>('/maps', params, () => adminMocks.listAdminMaps('', params as AdminMapListQuery)));
  return <MapsView data={data} error={error} page={pageNumber(params.page)} />;
}
