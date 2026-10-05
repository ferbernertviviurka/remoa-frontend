import { adminMocks } from '@remoa/contracts/mocks';
import type { AdminStoreWaitlistSummary, AdminWaitlistListQuery, AdminWaitlistPage } from '@remoa/contracts';
import { adminGet, requireAdmin } from '@/features/admin/shared/api';
import { adminList, flat, mocked, pageNumber, unwrap, type ListSearch } from '@/features/admin/list-kit/server';
import { WaitlistView } from '@/features/admin/waitlist/waitlist-view';

export default async function Page({ searchParams }: { searchParams: Promise<ListSearch> }) {
  await requireAdmin();
  const params = flat(await searchParams);
  const { data, error } = unwrap(await adminList<AdminWaitlistPage>('/waitlist', params, () => adminMocks.listAdminWaitlist('', params as AdminWaitlistListQuery)));
  const store = mocked() ? null : await adminGet<AdminStoreWaitlistSummary>('/store-waitlist');
  return <WaitlistView data={data} error={error} page={pageNumber(params.page)} store={store?.ok ? store.data : null} />;
}
