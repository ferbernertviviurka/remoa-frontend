import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ToastProvider } from '@remoa/ui';
import { violations } from '@/features/cards/test-utils';
import { MapPropertiesDialog } from './map-properties-dialog';

const refresh = vi.fn();
const api = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('@/features/coverage/matrix-suggestions', () => ({ useMatrixSuggestions: () => [] }));

const board = { id: 'b1', title: 'Sepse', area: 'CM' as const, access: 'owner' as const, matrixItemIds: ['i1', 'i2'] };
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MapPropertiesDialog', () => {
  it('renames and changes access through the existing endpoints', async () => {
    api.mockResolvedValue({ ok: true, data: [] });
    render(
      <ToastProvider closeLabel="Fechar" viewportLabel="Avisos">
        <MapPropertiesDialog board={board} open onOpenChange={() => {}} />
      </ToastProvider>,
    );
    fireEvent.change(screen.getByLabelText('Nome do mapa'), { target: { value: 'Sepse grave' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Público' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/boards/b1', { method: 'PATCH', body: JSON.stringify({ title: 'Sepse grave' }) }));
    expect(api).toHaveBeenCalledWith('/v1/boards/b1/share', { method: 'PUT', body: JSON.stringify({ access: 'public' }) });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('changing the area warns, PATCHes it and diffs links against the reply', async () => {
    api.mockImplementation(async (path: string, init?: { method?: string }) => ({ ok: true, data: path === '/v1/boards/b1' && init?.method === 'PATCH' ? { matrixItemIds: [] } : [] }));
    render(
      <ToastProvider closeLabel="Fechar" viewportLabel="Avisos">
        <MapPropertiesDialog board={board} open onOpenChange={() => {}} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pediatria' }));
    expect(screen.getByText(/itens da matriz de outras áreas serão removidos/)).toBeTruthy();
    expect(await violations(document.body)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/boards/b1', { method: 'PATCH', body: JSON.stringify({ area: 'PED' }) }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(api.mock.calls.some((c) => c[0] === '/v1/matrix/links')).toBe(false); // server already dropped them
  });
});
