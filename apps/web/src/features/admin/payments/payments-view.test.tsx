import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { AdminPaymentDetail, AdminPaymentPage } from '@remoa/contracts';

const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }), usePathname: () => '/admin/transacoes', useSearchParams: () => new URLSearchParams('status=paid&page=2') }));
const exportAdminCsv = vi.fn();
const runAdminAction = vi.fn();
vi.mock('../shared/actions', () => ({ exportAdminCsv: (...a: unknown[]) => exportAdminCsv(...a), runAdminAction: (...a: unknown[]) => runAdminAction(...a) }));
const fetchAdminDetail = vi.fn();
vi.mock('../list-kit/detail-action', () => ({ fetchAdminDetail: (...a: unknown[]) => fetchAdminDetail(...a) }));
const { PaymentsView } = await import('./payments-view');

const ana = { id: 'u1', name: 'Ana Costa', email: 'ana@x.com' };
const at = new Date('2026-10-01T12:00:00.000Z');
const row = (id: string, status: AdminPaymentDetail['status']) => ({ id, user: ana, item: 'pro_annual' as const, method: 'pix' as const, coupon: 'FUNDADOR', status, amountCents: 34900, currency: 'brl', createdAt: at });
const page: AdminPaymentPage = { items: [row('pi_paid', 'paid'), row('pi_pend', 'pending')], total: 2, page: 1, pageSize: 25, summary: { receivedCents: 75400, paid: 6, pending: 1, failed: 2, refunded: 1 } };
const detail = (id: string, status: AdminPaymentDetail['status']): AdminPaymentDetail => ({ ...row(id, status), stripeCustomerId: 'cus_1', stripeSubscriptionId: 'sub_1', stripePaymentIntent: id, stripeInvoiceId: null, refundedAt: null, timeline: [{ type: 'checkout_created', at }, { type: 'paid', at }], audit: [] });
const query = { status: '', method: '', q: '', page: 1 };

afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function openRow(id: string, status: AdminPaymentDetail['status']) {
  fetchAdminDetail.mockResolvedValue({ ok: true, data: detail(id, status) });
  fireEvent.click(screen.getAllByRole('button', { name: /Abrir transação de Ana Costa/ })[id === 'pi_paid' ? 0 : 1]!);
  return screen.findByRole('dialog', { name: 'Ana Costa' });
}
const reason = (v: string) => fireEvent.change(screen.getByRole('textbox'), { target: { value: v } });

describe('Transações', () => {
  it('shows the summary and rows with method and coupon', () => {
    render(<PaymentsView data={page} query={query} />);
    expect(screen.getByText('recebidos')).toBeInTheDocument();
    expect(screen.getByText('R$ 754,00')).toBeInTheDocument();
    expect(screen.getAllByText('Pix · FUNDADOR')).toHaveLength(2);
  });

  it('filters and search go to the URL, resetting the page', () => {
    vi.useFakeTimers();
    render(<PaymentsView data={page} query={query} />);
    fireEvent.click(screen.getByRole('group', { name: 'Status' }).querySelectorAll('button')[2]!); // Pendente
    expect(replace).toHaveBeenCalledWith('/admin/transacoes?status=pending', { scroll: false });
    fireEvent.click(within(screen.getByRole('group', { name: 'Método' })).getByRole('button', { name: 'Todos' }));
    expect(replace).toHaveBeenLastCalledWith('/admin/transacoes?status=paid', { scroll: false });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'pi_8f' } });
    vi.advanceTimersByTime(300);
    expect(replace).toHaveBeenLastCalledWith('/admin/transacoes?status=paid&q=pi_8f', { scroll: false });
    vi.useRealTimers();
  });

  it('drawer shows timeline, Stripe ids and an external Stripe link', async () => {
    render(<PaymentsView data={page} query={query} />);
    const d = await openRow('pi_paid', 'paid');
    expect(await within(d).findByText('Checkout iniciado')).toBeInTheDocument();
    expect(within(d).getByText('Pagamento confirmado')).toBeInTheDocument();
    expect(within(d).getByText('cus_1')).toBeInTheDocument();
    const link = within(d).getByRole('link', { name: /Abrir no Stripe/ });
    expect(link).toHaveAttribute('href', 'https://dashboard.stripe.com/payments/pi_paid');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('refund needs a reason, keeps the status Pago and says the Stripe has to confirm', async () => {
    runAdminAction.mockResolvedValue({ ok: true, data: {}, auditId: 'a_1060' });
    render(<PaymentsView data={page} query={query} />);
    const d = await openRow('pi_paid', 'paid');
    expect(within(d).queryByRole('button', { name: 'Marcar como pago' })).toBeNull();
    fireEvent.click(await within(d).findByRole('button', { name: 'Reembolsar' }));
    reason('curto');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(runAdminAction).not.toHaveBeenCalled();
    reason('Cobrança duplicada');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('a_1060'));
    expect(runAdminAction).toHaveBeenCalledWith('/payments/pi_paid/refund', { reason: 'Cobrança duplicada' });
    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(screen.getByText(/Reembolso solicitado — o status muda quando o Stripe confirmar/)).toBeInTheDocument();
    expect(within(screen.getByRole('dialog', { name: 'Ana Costa' })).getByText('Pago')).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('mark as paid only for pending and requires "Conferi no Stripe" plus a reason', async () => {
    runAdminAction.mockResolvedValue({ ok: true, data: {}, auditId: 'a_1061' });
    render(<PaymentsView data={page} query={query} />);
    const d = await openRow('pi_pend', 'pending');
    expect(within(d).queryByRole('button', { name: 'Reembolsar' })).toBeNull();
    fireEvent.click(await within(d).findByRole('button', { name: 'Marcar como pago' }));
    reason('Pix conferido no banco');
    const confirm = screen.getByRole('button', { name: 'Confirmar' });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Conferi no Stripe' }));
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(runAdminAction).toHaveBeenCalledWith('/payments/pi_pend/mark-paid', { reason: 'Pix conferido no banco', checked: true }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('export asks for a reason and sends the current filters', async () => {
    exportAdminCsv.mockResolvedValue({ ok: true, auditId: 'a_1062', data: { csv: 'a,b' } });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    render(<PaymentsView data={page} query={{ ...query, status: 'paid' }} />);
    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/ }));
    reason('Fechamento do mês');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('a_1062'));
    expect(exportAdminCsv).toHaveBeenCalledWith({ reason: 'Fechamento do mês', resource: 'payments', filters: { status: 'paid' } });
  });
});
