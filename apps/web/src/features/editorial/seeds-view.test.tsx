import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SeedsView } from './seeds-view';

const api = vi.fn();
vi.mock('@/lib/analytics', () => ({ track: () => undefined }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined }) }));
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => api(...args) }));

afterEach(() => {
  cleanup();
  api.mockReset();
});

describe('SeedsView', () => {
  it('groups ready maps by area', async () => {
    api.mockResolvedValue({
      ok: true,
      data: [
        { id: '1', title: 'Sepse', area: 'CM', temporalMark: 'Enamed 2026.2' },
        { id: '2', title: 'Pneumonia', area: 'CM', temporalMark: 'Enamed 2026.2' },
      ],
    });
    render(<SeedsView />);
    expect(await screen.findByRole('heading', { level: 2, name: 'Clínica Médica' })).toBeVisible();
    expect(screen.getByText('Sepse')).toBeVisible();
    expect(screen.getByText('Pneumonia')).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Adicionar aos meus mapas' })).toHaveLength(2);
  });

  it('says the catalog is empty only after a successful load', async () => {
    api.mockResolvedValue({ ok: true, data: [] });
    render(<SeedsView />);
    expect(await screen.findByText('Os mapas prontos aparecem aqui quando a revisão editorial publicar a primeira edição.')).toBeVisible();
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
  });

  it('shows an error when the catalog cannot be loaded', async () => {
    api.mockResolvedValue({ ok: false, error: { code: 'internal', message: 'down' } });
    render(<SeedsView />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado do nosso lado. Tente de novo.');
    expect(screen.queryByText('Os mapas prontos aparecem aqui quando a revisão editorial publicar a primeira edição.')).toBeNull();
  });
});
