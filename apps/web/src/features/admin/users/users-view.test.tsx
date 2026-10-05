import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { AdminUserDetail, AdminUserPage } from '@remoa/contracts';
import { adminUserFixtures } from '@remoa/contracts/mocks';

const replace = vi.fn();
const refresh = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }), usePathname: () => '/admin/usuarios', useSearchParams: () => new URLSearchParams(search) }));
const runAdminAction = vi.fn();
vi.mock('../shared/actions', () => ({ runAdminAction: (...a: unknown[]) => runAdminAction(...a), exportAdminCsv: vi.fn() }));
const fetchAdminDetail = vi.fn();
vi.mock('../list-kit/detail-action', () => ({ fetchAdminDetail: (...a: unknown[]) => fetchAdminDetail(...a) }));
const { UsersView } = await import('./users-view');

const ana = adminUserFixtures[0]!;
const data: AdminUserPage = { items: adminUserFixtures, total: 2, page: 1, pageSize: 25, summary: { total: 2, active: 2, pending: 0, suspended: 0 } };
const detail: AdminUserDetail = { ...ana, timeline: [] };

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); search = ''; });

const openDrawer = async () => {
  fetchAdminDetail.mockResolvedValue({ ok: true, data: detail });
  render(<UsersView data={data} error={null} page={1} />);
  fireEvent.click(screen.getAllByRole('button', { name: /Ana Paula Lima/ })[0]!);
  return screen.findByRole('dialog', { name: 'Ana Paula Lima' });
};

describe('Usuários', () => {
  it('shows the summary and rows; empty and error states', () => {
    const { rerender } = render(<UsersView data={data} error={null} page={1} />);
    expect(screen.getByText('contas')).toBeInTheDocument();
    expect(screen.getByText('2 resultados')).toBeInTheDocument();
    rerender(<UsersView data={null} error="reauth_required" page={1} />);
    expect(screen.getByRole('alert')).toHaveTextContent('sessão de administração expirou');
    rerender(<UsersView data={{ ...data, items: [], total: 0 }} error={null} page={1} />);
    expect(screen.getByText('Nada encontrado com esses filtros.')).toBeInTheDocument();
  });

  it('labels a running grant "Pro por indicação" and filters by it', () => {
    const grant = { ...ana, plan: 'pro' as const, grantUntil: new Date('2027-01-01') };
    render(<UsersView data={{ ...data, items: [grant] }} error={null} page={1} />);
    expect(within(screen.getByRole('table')).getByText('Pro por indicação')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pro por indicação' }));
    expect(replace).toHaveBeenCalledWith('/admin/usuarios?plan=pro_grant', { scroll: false });
  });

  it('filters and search go to the URL (server side), page resets', () => {
    vi.useFakeTimers();
    search = 'page=3';
    render(<UsersView data={data} error={null} page={3} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pro' }));
    expect(replace).toHaveBeenCalledWith('/admin/usuarios?plan=pro', { scroll: false });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar' }), { target: { value: 'ana' } });
    vi.advanceTimersByTime(350);
    expect(replace).toHaveBeenLastCalledWith('/admin/usuarios?q=ana', { scroll: false });
  });

  it('opens the drawer on row click and offers the user actions', async () => {
    const drawer = await openDrawer();
    expect(within(drawer).getByText('ana.lima@exemplo.com')).toBeInTheDocument();
    for (const a of ['Conceder 1 mês de Pro', 'Enviar redefinição de senha', 'Suspender', 'Agendar exclusão']) expect(within(drawer).getByRole('button', { name: a })).toBeInTheDocument();
    expect(fetchAdminDetail).toHaveBeenCalledWith(`/users/${ana.id}`);
  });

  it('blocks a reason under 8 characters, then runs the action and shows the audit entry in the drawer', async () => {
    runAdminAction.mockResolvedValue({ ok: true, auditId: 'a_1050', data: {} });
    const drawer = await openDrawer();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Suspender' }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.change(within(dialog).getByLabelText('Motivo (obrigatório)'), { target: { value: 'curto' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Suspender' }));
    expect(runAdminAction).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('alert')).toHaveTextContent('pelo menos 8 caracteres');
    fireEvent.change(within(dialog).getByLabelText('Motivo (obrigatório)'), { target: { value: 'Conta compartilhada' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Suspender' }));
    await waitFor(() => expect(within(dialog).getByRole('status')).toHaveTextContent('Ação registrada na auditoria (a_1050)'));
    expect(runAdminAction).toHaveBeenCalledWith(`/users/${ana.id}/suspend`, { reason: 'Conta compartilhada' });
    expect(refresh).toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Concluir' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    const trail = within(screen.getByRole('dialog', { name: 'Ana Paula Lima' }));
    expect(trail.getByText(/Conta suspensa · Conta compartilhada/)).toHaveTextContent('a_1050');
  });

  it('asks to sign in again when the API answers reauth_required', async () => {
    runAdminAction.mockResolvedValue({ ok: false, error: { code: 'reauth_required', message: 'x' } });
    const drawer = await openDrawer();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Conceder 1 mês de Pro' }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.change(within(dialog).getByLabelText('Motivo (obrigatório)'), { target: { value: 'Cortesia de teste' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Conceder' }));
    await waitFor(() => expect(within(dialog).getByRole('alert')).toHaveTextContent('login recente'));
  });
});
