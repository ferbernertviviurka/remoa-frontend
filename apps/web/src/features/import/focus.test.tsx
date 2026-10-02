import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NewMapView } from '@/features/map/create/new-map-view';

const api = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('./upload', () => ({ putApkg: async () => true }));
Object.assign(Element.prototype, { scrollIntoView: () => undefined, hasPointerCapture: () => false, releasePointerCapture: () => undefined });

const summary = { decks: [{ id: 'd', name: 'CM', cardCount: 1, noteCount: 1 }], noteTypes: [{ id: 'n', name: 'Basic', kind: 'basic', fields: ['Front', 'Back'], noteCount: 1, samples: [{ Front: 'a', Back: 'b' }] }], cardCount: 1, mediaCount: 0 };

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('import focus', () => {
  it('moves focus to the new heading at each stage', async () => {
    api.mockImplementation(async (path: string) => {
      if (path === '/v1/imports/anki/sign') return { ok: true, data: { url: 'u', key: 'k' } };
      if (path === '/v1/imports/anki/inspect') return { ok: true, data: summary };
      if (path === '/v1/imports/anki') return { ok: false, error: { code: 'internal', message: 'falhou' } };
      return { ok: false, error: { code: 'not_found', message: path } };
    });
    render(<NewMapView items={[{ id: 'i1', area: 'CM', code: '1', title: 'Sepse', parentId: null, targetCards: 10 }]} initialPath="anki" />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.change(document.querySelector('input[type=file]')!, { target: { files: [new File(['x'], 'a.apkg')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Importar para o mapa' }));
    const preview = await screen.findByRole('heading', { level: 1, name: 'Confira o que vira o quê' });
    await waitFor(() => expect(document.activeElement).toBe(preview));
    fireEvent.click(screen.getByRole('button', { name: /^Importar \d+ card/ }));
    const err = await screen.findByRole('heading', { level: 1, name: 'Não deu para importar' });
    await waitFor(() => expect(document.activeElement).toBe(err));
  });
});
