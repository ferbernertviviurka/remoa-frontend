import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOBILE_MAP_PREFS_KEY, type BoardGraph, type Card } from '@remoa/contracts';
import { retrievabilityFixture, sepseBoard, sepseCards, sepseEdges } from '@remoa/contracts/mocks';
import { ToastProvider } from '@remoa/ui';
import { ChallengeProvider } from '@/features/challenge/provider';

const api = vi.fn();
const push = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: () => undefined, rememberBoard: () => undefined }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: () => undefined }),
  usePathname: () => `/app/mapas/${sepseBoard.id}`,
  useSearchParams: () => new URLSearchParams(),
}));

const { MobileMap } = await import('./mobile-map');

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  globalThis.DOMMatrixReadOnly ??= class {
    m22 = 1;
  } as unknown as typeof DOMMatrixReadOnly;
});

const graph = (cards: Card[] = sepseCards): BoardGraph => ({ board: sepseBoard, cards, edges: sepseEdges });
const many = Array.from({ length: 10 }, (_, i): Card => ({ ...sepseCards[0]!, id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, title: `Extra ${i}` }));

beforeEach(() => {
  window.localStorage.clear();
  api.mockImplementation(async (path: string) => {
    if (path.startsWith('/v1/review/retrievability')) return { ok: true, data: retrievabilityFixture };
    if (path === '/v1/review/hub') return { ok: false, error: { code: 'internal', message: 'x' } };
    return { ok: true, data: { applied: [] } };
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mount = (g = graph()) =>
  render(
    <ToastProvider closeLabel="x" viewportLabel="y">
      <ChallengeProvider>
        <MobileMap graph={g} />
      </ChallengeProvider>
    </ToastProvider>,
  );

describe('MobileMap (F23 T5)', () => {
  it('full-screen map: pill header with save state, undo/redo off, zoom at 100%, floating bar', async () => {
    const { container } = mount();
    expect(container.querySelector('[data-mobile-map]')).not.toBeNull();
    expect(document.querySelector('header')!.textContent).toContain(sepseBoard.title);
    expect(screen.getByRole('status').textContent).toMatch(/Salvo/);
    expect(screen.getByRole('button', { name: 'Desfazer' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('button', { name: 'Refazer' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('group', { name: 'Zoom' }).textContent).toContain('100%');
    expect(screen.getByRole('button', { name: 'Criar card' })).toBeTruthy();
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/^\/v1\/review\/retrievability/)));
  });

  it('restores the saved view of this map', () => {
    window.localStorage.setItem(MOBILE_MAP_PREFS_KEY, JSON.stringify({ viewports: { [sepseBoard.id]: { x: 0, y: 0, zoom: 0.6 } } }));
    mount();
    expect(screen.getByRole('group', { name: 'Zoom' }).textContent).toContain('60%');
  });

  it('search swaps the title for a field; closing clears it', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar card' }));
    const field = screen.getByRole('searchbox', { name: 'Buscar card' });
    fireEvent.change(field, { target: { value: 'choque' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fechar busca' }));
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(document.querySelector('header')!.textContent).toContain(sepseBoard.title);
  });

  it('list toggle swaps the canvas and is remembered on the device', async () => {
    vi.useFakeTimers();
    try {
      mount();
      fireEvent.click(screen.getByRole('button', { name: 'Mostrar cards em lista' }));
      expect(screen.getByRole('button', { name: 'Voltar ao mapa' }).getAttribute('aria-pressed')).toBe('true');
      expect(screen.queryByRole('group', { name: 'Zoom' })).toBeNull();
      act(() => vi.advanceTimersByTime(400));
      expect(JSON.parse(window.localStorage.getItem(MOBILE_MAP_PREFS_KEY)!).view).toBe('list');
    } finally {
      vi.useRealTimers();
    }
  });

  it('Revisar: below the challenge minimum it explains; with enough cards it opens the map session', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: /^Revisar este mapa/ }));
    expect(push).not.toHaveBeenCalled();
    expect(await screen.findByText(/cards/)).toBeTruthy();
    cleanup();
    mount(graph([...sepseCards, ...many]));
    fireEvent.click(screen.getByRole('button', { name: /^Revisar este mapa/ }));
    expect(push).toHaveBeenCalledWith(`/app/mapas/${sepseBoard.id}?modo=desafio`);
  });

  it('the hamburger opens the map aside', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir o menu do mapa' }));
    expect(await screen.findByRole('dialog', { name: 'Menu do mapa' })).toBeTruthy();
  });
});
