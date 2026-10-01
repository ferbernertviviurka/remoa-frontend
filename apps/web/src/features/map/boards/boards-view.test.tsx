import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BoardSummary } from '@remoa/contracts';
import { ToastProvider } from '@remoa/ui';
import { BoardsView } from './boards-view';

const push = vi.fn();
const refresh = vi.fn();
const api = vi.fn();
const track = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));

const board: BoardSummary = { id: 'b1', title: 'Sepse', area: 'CM', status: 'private', updatedAt: new Date('2026-10-01T00:00:00Z'), cardCount: 0, edgeCount: 0 };
const view = (boards: BoardSummary[]) =>
  render(
    <ToastProvider closeLabel="Fechar" viewportLabel="Avisos">
      <BoardsView boards={boards} />
    </ToastProvider>,
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('BoardsView', () => {
  it('creates a board, tracks it and navigates to the canvas', async () => {
    api.mockResolvedValue({ ok: true, data: { id: 'new1' } });
    view([]);
    fireEvent.click(screen.getByRole('button', { name: 'Criar mapa em branco' }));
    fireEvent.change(screen.getByLabelText('Nome do mapa'), { target: { value: 'Sepse' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar mapa' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/mapas/new1'));
    expect(api).toHaveBeenCalledWith('/v1/boards', { method: 'POST', body: JSON.stringify({ title: 'Sepse' }) });
    expect(track).toHaveBeenCalledWith('board_created', {});
  });

  it('shows the API error and does not navigate when create fails', async () => {
    api.mockResolvedValue({ ok: false, error: { code: 'quota_exceeded', message: 'x' } });
    view([]);
    fireEvent.click(screen.getByRole('button', { name: 'Criar mapa em branco' }));
    fireEvent.change(screen.getByLabelText('Nome do mapa'), { target: { value: 'Sepse' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar mapa' }));
    await screen.findByText('Você chegou ao limite do seu plano.');
    expect(push).not.toHaveBeenCalled();
  });

  it('archives after confirmation and restores with Desfazer', async () => {
    api.mockResolvedValue({ ok: true, data: board });
    view([board]);
    fireEvent.click(screen.getByRole('button', { name: 'Arquivar' }));
    expect(api).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Arquivar' }).at(-1)!);
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/boards/b1', { method: 'PATCH', body: JSON.stringify({ archived: true }) }));
    fireEvent.click(await screen.findByRole('button', { name: 'Desfazer' }));
    await waitFor(() => expect(api).toHaveBeenLastCalledWith('/v1/boards/b1', { method: 'PATCH', body: JSON.stringify({ archived: false }) }));
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
