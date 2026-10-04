import { notFound } from 'next/navigation';
import { t } from '@remoa/strings';
import { AdminHeader } from '@remoa/ui';
import { getAdminOverview, requireAdmin } from '@/features/admin/shared/api';
import { OverviewView } from '@/features/admin/overview/overview-view';
import { parsePeriod } from '@/features/admin/overview/period';

export default async function Page({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireAdmin();
  const period = parsePeriod((await searchParams).period);
  const r = await getAdminOverview(period);
  if (!r.ok && r.error.code === 'not_found') notFound();
  return r.ok ? <OverviewView data={r.data} period={period} /> : <AdminHeader title={t('admin.overview.label')} subtitle={t('admin.overview.loadError')} />;
}
