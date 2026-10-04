import { adminMocks } from '@remoa/contracts/mocks';
import type { AdminReferralListQuery, AdminReferralPage } from '@remoa/contracts';
import { requireAdmin } from '@/features/admin/shared/api';
import { adminList, flat, pageNumber, unwrap, type ListSearch } from '@/features/admin/list-kit/server';
import { ReferralsView } from '@/features/admin/referrals/referrals-view';

export default async function Page({ searchParams }: { searchParams: Promise<ListSearch> }) {
  await requireAdmin();
  const params = flat(await searchParams);
  const { data, error } = unwrap(await adminList<AdminReferralPage>('/referrals', params, () => adminMocks.listAdminReferrals('', params as AdminReferralListQuery)));
  return <ReferralsView data={data} error={error} page={pageNumber(params.page)} />;
}
