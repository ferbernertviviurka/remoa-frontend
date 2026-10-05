import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { AdminReferralDetail } from '@remoa/contracts';
import { adminReferralFixtures } from '@remoa/contracts/mocks';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: push, refresh: vi.fn() }), usePathname: () => '/admin/indicacoes', useSearchParams: () => new URLSearchParams() }));
const runAdminAction = vi.fn();
vi.mock('../shared/actions', () => ({ runAdminAction: (...a: unknown[]) => runAdminAction(...a) }));
const fetchAdminDetail = vi.fn();
vi.mock('../list-kit/detail-action', () => ({ fetchAdminDetail: (...a: unknown[]) => fetchAdminDetail(...a) }));
const { ReferralsView } = await import('./referrals-view');

const r = adminReferralFixtures[0]!;
const data = { items: [r], total: 1, page: 1, pageSize: 25, summary: { qualified: 0, inProgress: 0, inReview: 1, rejected: 0, monthsGranted: 0 } };
const open = async (detail: AdminReferralDetail) => {
  fetchAdminDetail.mockResolvedValue({ ok: true, data: detail });
  render(<ReferralsView data={data} error={null} page={1} />);
  fireEvent.click(screen.getAllByRole('button', { name: /Ana Paula Lima/ })[0]!);
  return screen.findByRole('dialog', { name: 'Ana Paula Lima' });
};

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Indicações', () => {
  it('lists the fraud signals and the reward; status filter goes to the URL', () => {
    render(<ReferralsView data={data} error={null} page={1} />);
    expect(screen.getByText('1 sinal')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Em revisão' }));
    expect(push).toHaveBeenCalledWith('/admin/indicacoes?status=in_review', { scroll: false });
  });

  it('approve posts with the reason and the drawer shows the signal in plain words', async () => {
    runAdminAction.mockResolvedValue({ ok: true, auditId: 'a_1070', data: {} });
    const drawer = await open(r);
    expect(within(drawer).getByText('Muitos convites em pouco tempo')).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Aprovar e conceder' }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.change(within(dialog).getByLabelText('Motivo (obrigatório)'), { target: { value: 'Verifiquei os dois contatos' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aprovar e conceder' }));
    await waitFor(() => expect(runAdminAction).toHaveBeenCalledWith(`/referrals/${r.id}/approve`, { reason: 'Verifiquei os dois contatos' }));
  });

  it('revoke only appears with an active grant and revokes each one', async () => {
    runAdminAction.mockResolvedValueOnce({ ok: true, auditId: 'a_1071', data: {} }).mockResolvedValueOnce({ ok: true, auditId: 'a_1072', data: {} });
    const g = (id: string, userId: string) => ({ id, userId, startsAt: new Date(), endsAt: new Date(), revokedAt: null });
    const drawer = await open({ ...r, status: 'qualified', rewardMonths: 2, grants: [g('g1', r.referrer!.id), g('g2', r.referee!.id)] });
    fireEvent.click(await within(drawer).findByRole('button', { name: 'Revogar concessão' }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.change(within(dialog).getByLabelText('Motivo (obrigatório)'), { target: { value: 'Fraude confirmada' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Revogar' }));
    await waitFor(() => expect(runAdminAction).toHaveBeenCalledTimes(2));
    expect(runAdminAction).toHaveBeenCalledWith(`/referrals/${r.id}/revoke-grant`, { reason: 'Fraude confirmada', grantId: 'g1' });
    expect(runAdminAction).toHaveBeenCalledWith(`/referrals/${r.id}/revoke-grant`, { reason: 'Fraude confirmada', grantId: 'g2' });
    expect(await within(dialog).findByRole('status')).toHaveTextContent('a_1071 e a_1072');
  });
});
