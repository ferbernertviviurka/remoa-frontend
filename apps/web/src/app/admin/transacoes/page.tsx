import { paymentRecordMethods, paymentStatuses, type AdminPaymentPage } from '@remoa/contracts';
import { adminGet, requireAdmin } from '@/features/admin/shared/api';
import { oneOf, pageOfParam } from '@/features/admin/payments/helpers';
import { PaymentsView } from '@/features/admin/payments/payments-view';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const query = { status: oneOf(sp.status, paymentStatuses) ?? '', method: oneOf(sp.method, paymentRecordMethods) ?? '', q: (sp.q ?? '').slice(0, 120), page: pageOfParam(sp.page) };
  const r = await adminGet<AdminPaymentPage>('/payments', query);
  return <PaymentsView data={r.ok ? r.data : null} query={query} />;
}
