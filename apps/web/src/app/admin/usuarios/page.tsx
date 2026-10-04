import { adminMocks } from '@remoa/contracts/mocks';
import type { AdminUserListQuery, AdminUserPage } from '@remoa/contracts';
import { requireAdmin } from '@/features/admin/shared/api';
import { adminList, flat, pageNumber, unwrap, type ListSearch } from '@/features/admin/list-kit/server';
import { UsersView } from '@/features/admin/users/users-view';

export default async function Page({ searchParams }: { searchParams: Promise<ListSearch> }) {
  await requireAdmin();
  const params = flat(await searchParams);
  const { data, error } = unwrap(await adminList<AdminUserPage>('/users', params, () => adminMocks.listAdminUsers('', params as AdminUserListQuery)));
  return <UsersView data={data} error={error} page={pageNumber(params.page)} />;
}
