import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { AuditEntry, AuditPage } from '@remoa/contracts';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh: vi.fn() }), usePathname: () => '/admin/auditoria', useSearchParams: () => new URLSearchParams('page=3') }));
const exportAdminCsv = vi.fn();
vi.mock('../shared/actions', () => ({ exportAdminCsv: (...a: unknown[]) => exportAdminCsv(...a) }));
const { AuditView } = await import('./audit-view');

const e = (id: number, over: Partial<AuditEntry> = {}): AuditEntry => ({
  id, createdAt: new Date('2026-10-01T12:00:00.000Z'), actorType: 'admin', actor: { id: 'me', name: 'Admin', email: 'a@x.com' }, action: 'payment.refund', targetType: 'payment', targetId: 'pi_1', targetLabel: 'pi_1',
  reason: 'Cobrança duplicada', result: 'success', denial: null, before: { status: 'paid' }, after: { status: 'refund_requested' }, ipHash: 'abcdef12a41f', userAgent: 'Chrome', requestId: 'req-1', ...over,
});
const data: AuditPage = { items: [e(1050), e(1049, { actorType: 'stripe', actor: null, action: 'payment.webhook', reason: null, ipHash: null }), e(1048, { result: 'denied', denial: 'missing_reason', action: 'export.csv', before: null, after: null })], total: 3, page: 1, pageSize: 25, summary: { total: 12, admin: 7, system: 5, denied: 1 } };
const query = { actor: '', result: '', action: '', period: '', q: '', page: 1 };

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Auditoria', () => {
  it('lists entries with who, result and origin; Stripe shows as Webhook Stripe', () => {
    render(<AuditView data={data} query={query} meId="me" />);
    expect(screen.getByText('Reembolsou transação')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByText('Você (admin)').length).toBeGreaterThan(0);
    expect(within(screen.getByRole('table')).getByText('Webhook Stripe')).toBeInTheDocument();
    expect(screen.getAllByText('IP …a41f')).toHaveLength(2);
    expect(within(screen.getByRole('table')).getByText('Negado')).toBeInTheDocument();
  });

  it('shows the target label, falling back to the id, and the four summary chips', () => {
    render(<AuditView data={{ ...data, items: [e(1, { targetLabel: 'Carla Souza' }), e(2, { targetLabel: null, targetId: 'pi_9' })] }} query={query} meId="me" />);
    expect(screen.getByText('Carla Souza')).toBeInTheDocument();
    expect(screen.getByText('pi_9')).toBeInTheDocument();
    for (const l of ['registros', 'de admins', 'do sistema', 'negados']) expect(screen.getByText(l)).toBeInTheDocument();
  });

  it('filters go to the URL and reset the page', () => {
    render(<AuditView data={data} query={query} meId="me" />);
    fireEvent.click(within(screen.getByRole('group', { name: 'Resultado' })).getByRole('button', { name: 'Negado' }));
    expect(replace).toHaveBeenCalledWith('/admin/auditoria?result=denied', { scroll: false });
    fireEvent.click(within(screen.getByRole('group', { name: 'Quem' })).getByRole('button', { name: 'Você (admin)' }));
    expect(replace).toHaveBeenLastCalledWith('/admin/auditoria?actor=me', { scroll: false });
    fireEvent.click(within(screen.getByRole('group', { name: 'Período' })).getByRole('button', { name: '7 dias' }));
    expect(replace).toHaveBeenLastCalledWith('/admin/auditoria?period=7', { scroll: false });
    fireEvent.click(within(screen.getByRole('group', { name: 'Quem' })).getByRole('button', { name: 'Sistema' }));
    expect(replace).toHaveBeenLastCalledWith('/admin/auditoria?actor=system', { scroll: false });
  });

  it('drawer shows every field and the before/after as read-only JSON, with no edit controls', () => {
    render(<AuditView data={data} query={query} meId="me" />);
    fireEvent.click(screen.getAllByRole('button', { name: /Abrir registro a_1050/ })[0]!);
    const d = screen.getByRole('dialog', { name: 'Reembolsou transação' });
    for (const text of ['req-1', 'abcdef12a41f', 'Chrome', 'Cobrança duplicada', 'payment.refund']) expect(within(d).getByText(text)).toBeInTheDocument();
    expect(d.querySelectorAll('pre')).toHaveLength(2);
    expect(within(d).getByText(/"refund_requested"/)).toBeInTheDocument();
    expect(d.querySelectorAll('input,textarea,[contenteditable]')).toHaveLength(0);
    expect(within(d).queryByRole('button', { name: /editar|excluir|apagar/i })).toBeNull();
    expect(within(d).getAllByRole('button')).toHaveLength(1); // only "Fechar"
  });

  it('export asks for a reason and carries the active filters (actor = me)', async () => {
    exportAdminCsv.mockResolvedValue({ ok: true, auditId: 'a_1070', data: { csv: 'x' } });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    render(<AuditView data={data} query={{ ...query, actor: 'me', result: 'denied' }} meId="me" from="2026-09-24T00:00:00.000Z" />);
    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/ }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Revisão trimestral' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('a_1070'));
    expect(exportAdminCsv).toHaveBeenCalledWith({ reason: 'Revisão trimestral', resource: 'audit', filters: { actorId: 'me', result: 'denied', from: '2026-09-24T00:00:00.000Z' } });
  });
});
