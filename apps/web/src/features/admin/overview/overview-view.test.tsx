import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { adminOverviewFixture } from '@remoa/contracts/mocks';

const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }));
const exportAdminCsv = vi.fn();
vi.mock('../shared/actions', () => ({ exportAdminCsv: (...a: unknown[]) => exportAdminCsv(...a) }));
const { OverviewView } = await import('./overview-view');
const { parsePeriod } = await import('./period');

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });

describe('Visão geral', () => {
  it('parses the period from the URL, defaulting to 30', () => {
    expect([parsePeriod("7"), parsePeriod("90"), parsePeriod("x"), parsePeriod(undefined)]).toEqual([7, 90, 30, 30]);
  });

  it('shows the six KPIs and switches period through the URL', () => {
    render(<OverviewView data={adminOverviewFixture} period={30} />);
    for (const n of ['Total de contas', 'Total de mapas', 'Assinantes Pro', 'Receita no período', 'Indicações qualificadas', 'Chamados abertos']) expect(screen.getByText(n)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '7 dias' }));
    expect(replace).toHaveBeenCalledWith('/admin?period=7', { scroll: false });
  });

  it('links attention items and "Ver todos" to the lists', () => {
    render(<OverviewView data={adminOverviewFixture} period={30} />);
    expect(screen.getByRole('link', { name: /indicações em revisão/ })).toHaveAttribute('href', '/admin/indicacoes?status=in_review');
    expect(screen.getAllByRole('link', { name: /Ver tod[ao]s/ }).map((a) => a.getAttribute('href'))).toEqual(['/admin/transacoes', '/admin/usuarios', '/admin/mapas']);
  });

  it('shows revenue delta as a percentage, the stale-tickets badge, method and area', () => {
    const { kpis, attention } = adminOverviewFixture;
    render(<OverviewView data={adminOverviewFixture} period={30} />);
    expect(screen.getByText(`+${kpis.revenue.deltaPct}%`)).toBeInTheDocument();
    expect(screen.getByText(`${attention.ticketsStale} sem resposta`)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Método' })).toBeInTheDocument();
    expect(screen.getAllByText('Clínica Médica').length).toBeGreaterThan(0);
  });

  it('refreshes every 60 s', () => {
    vi.useFakeTimers();
    render(<OverviewView data={adminOverviewFixture} period={30} />);
    vi.advanceTimersByTime(60_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('export asks for a reason (>= 8) and then exports the overview', async () => {
    exportAdminCsv.mockResolvedValue({ ok: true, auditId: 'a_1051', data: { csv: 'a,b' } });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    render(<OverviewView data={adminOverviewFixture} period={30} />);
    fireEvent.click(screen.getByRole('button', { name: /Exportar/ }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'curto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(exportAdminCsv).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Relatório mensal da diretoria' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('a_1051'));
    expect(exportAdminCsv).toHaveBeenCalledWith({ reason: 'Relatório mensal da diretoria', resource: 'overview', filters: { period: '30' } });
  });
});
