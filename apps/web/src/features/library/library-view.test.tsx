import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { violations } from '../cards/test-utils';
import { LibraryView } from './library-view';
import { ReportButton } from './report-button';

const api = vi.fn();
const push = vi.fn();
const handle = vi.fn(() => false);
vi.mock('@/lib/analytics', () => ({ track: () => undefined }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/features/billing/paywall', () => ({ usePaywall: () => ({ handle, show: () => undefined }) }));

const seed = (o: object) => ({ id: '1', title: 'Sepse', area: 'CM', temporalMark: 'Enamed 2026.2', version: 2, badges: [], contentVersion: '2026.1', cardCount: 90, estimatedMinutes: 135, levels: [1, 2], reviewerName: 'Ana Lima', reviewerCrm: '123456-SP', ...o });

afterEach(() => { cleanup(); api.mockReset(); push.mockReset(); handle.mockReset(); handle.mockReturnValue(false); });

describe('LibraryView', () => {
  it('lists ready maps with stats, reviewer seal, Top 10 badge only where present, and the legal notice', async () => {
    api.mockResolvedValue({ ok: true, data: [seed({ badges: ['top10_enamed'] }), seed({ id: '2', title: 'Pneumonia' })] });
    const { container } = render(<LibraryView />);
    expect(await screen.findByRole('heading', { level: 3, name: 'Sepse' })).toBeVisible();
    expect(screen.getAllByText('Top 10 ENAMED')).toHaveLength(1);
    expect(screen.getAllByText('Revisado por Dr(a). Ana Lima, CRM 123456-SP')).toHaveLength(2);
    expect(screen.getAllByText(/90 cards · ~135 min · Versão 2026.1/)).toHaveLength(2);
    expect(screen.getByText(/Conteúdo educacional\. Não substitui diretriz clínica nem supervisão\./)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos-de-uso');
    expect(await violations(container)).toEqual([]);
  });

  it('filters by title and Usar copies, then opens the copy; a quota error goes to the paywall', async () => {
    api.mockImplementation((path: string) => Promise.resolve(path.includes('/copy') ? { ok: true, data: { id: 'c1' } } : { ok: true, data: [seed({}), seed({ id: '2', title: 'Pneumonia' })] }));
    render(<LibraryView />);
    await screen.findByText('Pneumonia');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'pneu' } });
    expect(screen.queryByRole('heading', { name: 'Sepse' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Usar este mapa' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/mapas/c1'));
    expect(api).toHaveBeenCalledWith('/v1/editorial/copy', expect.objectContaining({ method: 'POST', body: JSON.stringify({ boardId: '2' }) }));
  });

  it('shows the paywall when the plan does not allow the copy', async () => {
    handle.mockReturnValue(true);
    api.mockImplementation((path: string) => Promise.resolve(path.includes('/copy') ? { ok: false, error: { code: 'quota_exceeded', message: 'boards' } } : { ok: true, data: [seed({})] }));
    render(<LibraryView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Usar este mapa' }));
    await waitFor(() => expect(handle).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });
});

describe('ReportButton', () => {
  it('sends the note for the card to the reviewer queue', async () => {
    api.mockResolvedValue({ ok: true, data: { id: 'q1' } });
    render(<ReportButton cardId="card-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Reportar erro' }));
    const send = await screen.findByRole('button', { name: 'Enviar' });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText('O que está errado?'), { target: { value: 'dose errada' } });
    fireEvent.click(send);
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/editorial/report', expect.objectContaining({ body: JSON.stringify({ cardId: 'card-1', note: 'dose errada' }) })));
    expect(await screen.findByText('Recebido. Um revisor vai analisar este card.')).toBeVisible();
  });
});
