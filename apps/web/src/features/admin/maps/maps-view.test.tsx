import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { AdminMapPage, AdminMapRow } from '@remoa/contracts';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }), usePathname: () => '/admin/mapas', useSearchParams: () => new URLSearchParams() }));
const runAdminAction = vi.fn();
vi.mock('../shared/actions', () => ({ runAdminAction: (...a: unknown[]) => runAdminAction(...a) }));
vi.mock('../list-kit/detail-action', () => ({ fetchAdminDetail: vi.fn().mockResolvedValue({ ok: false, code: 'not_found' }) }));
vi.mock('./audit-map-viewer', () => ({ AuditMapViewer: (p: { title: string; auditId: string }) => <div role="dialog" aria-label={p.title}>Modo auditoria {p.auditId}</div> }));
const { MapsView } = await import('./maps-view');

const row = (over: Partial<AdminMapRow>): AdminMapRow => ({ id: 'b1', title: 'Sepse', area: 'CM', owner: { id: 'u1', name: 'Gabi Lopes', email: 'g@x.com' }, cards: 6, edges: 6, status: 'private', origin: 'manual', createdAt: new Date(), ...over });
const page = (items: AdminMapRow[]): AdminMapPage => ({ items, total: items.length, page: 1, pageSize: 25, summary: { total: 9, private: 6, seedDraft: 2, seedApproved: 1 } });

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Mapas', () => {
  it('shows the area under the title, the four summary chips and an export button', () => {
    render(<MapsView data={page([row({ origin: 'import' })])} error={null} page={1} />);
    expect(screen.getByText('Clínica Médica')).toBeInTheDocument();
    for (const l of ['mapas', 'privados', 'seeds em rascunho', 'seeds aprovados']) expect(screen.getByText(l)).toBeInTheDocument();
    expect(screen.getByText('Importado', { selector: 'b' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exportar CSV/ })).toBeInTheDocument();
  });

  it('open (read-only) needs a reason, then shows the audit-mode viewer after the dialog closes', async () => {
    runAdminAction.mockResolvedValue({ ok: true, auditId: 'a_1060', data: { graph: { board: {}, cards: [], edges: [] } } });
    render(<MapsView data={page([row({})])} error={null} page={1} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Sepse/ })[0]!);
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir (somente leitura)' }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abrir' }));
    expect(runAdminAction).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('Motivo (obrigatório)'), { target: { value: 'Chamado do aluno' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abrir' }));
    await waitFor(() => expect(within(dialog).getByRole('status')).toHaveTextContent('a_1060'));
    expect(runAdminAction).toHaveBeenCalledWith('/maps/b1/open', { reason: 'Chamado do aluno' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Concluir' }));
    expect(await screen.findByText('Modo auditoria a_1060')).toBeInTheDocument();
  });

  it('seed draft offers approve (not archive); approved offers unpublish', async () => {
    render(<MapsView data={page([row({ status: 'seed_draft', origin: 'seed' })])} error={null} page={1} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Sepse/ })[0]!);
    expect(await screen.findByRole('button', { name: 'Aprovar seed' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Arquivar' })).not.toBeInTheDocument();
    cleanup();
    render(<MapsView data={page([row({ status: 'seed_approved', origin: 'seed' })])} error={null} page={1} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Sepse/ })[0]!);
    expect(await screen.findByRole('button', { name: 'Despublicar' })).toBeInTheDocument();
  });

  it('archive posts to the archive route', async () => {
    runAdminAction.mockResolvedValue({ ok: true, auditId: 'a_1061', data: {} });
    render(<MapsView data={page([row({})])} error={null} page={1} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Sepse/ })[0]!);
    fireEvent.click(await screen.findByRole('button', { name: 'Arquivar' }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.change(within(dialog).getByLabelText('Motivo (obrigatório)'), { target: { value: 'Conteúdo duplicado' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Arquivar' }));
    await waitFor(() => expect(runAdminAction).toHaveBeenCalledWith('/maps/b1/archive', { reason: 'Conteúdo duplicado' }));
  });
});
