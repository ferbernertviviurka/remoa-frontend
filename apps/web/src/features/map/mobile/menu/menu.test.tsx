import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOBILE_MAP_PREFS_KEY, type BoardGraph } from '@remoa/contracts';
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
const { MobileMap } = await import('../canvas/mobile-map');

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

const graph: BoardGraph = { board: sepseBoard, cards: sepseCards, edges: sepseEdges };
const prefs = () => JSON.parse(window.localStorage.getItem(MOBILE_MAP_PREFS_KEY) ?? '{}') as Record<string, unknown>;

beforeEach(() => {
  window.localStorage.clear();
  api.mockImplementation(async (path: string) => {
    if (path.startsWith('/v1/review/retrievability')) return { ok: true, data: retrievabilityFixture };
    if (path === '/v1/review/hub') return { ok: false, error: { code: 'internal', message: 'x' } };
    if (path === '/v1/coverage') return { ok: true, data: [] };
    if (path.endsWith('/duplicate')) return { ok: true, data: { ...sepseBoard, id: '11111111-1111-4111-8111-111111111111' } };
    return { ok: true, data: { applied: [] } };
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mount = () =>
  render(
    <ToastProvider closeLabel="x" viewportLabel="y">
      <ChallengeProvider>
        <MobileMap graph={graph} />
      </ChallengeProvider>
    </ToastProvider>,
  );
const openAside = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Abrir o menu do mapa' }));
  return screen.findByRole('dialog', { name: 'Menu do mapa' });
};

describe('aside content (F23 T8)', () => {
  it('shows name, progress from the heat of the map and the details', async () => {
    mount();
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/retrievability/)));
    const aside = await openAside();
    expect(within(aside).getByRole('heading', { name: sepseBoard.title })).toBeTruthy();
    const progress = within(aside).getByRole('region', { name: 'Progresso' });
    await waitFor(() => expect(progress.textContent).toMatch(/\d+%lembrança estimada/));
    expect(progress.textContent).toContain('para revisar');
    expect(within(aside).getByRole('button', { name: /^Desafiar/ })).toBeTruthy();
    expect(within(aside).getByText('Detalhes')).toBeTruthy();
    expect(within(aside).getByText(/\d+ cards · \d+ conexões/)).toBeTruthy();
  });

  it('layers are switches that persist in the prefs of the device and reach the map', async () => {
    mount();
    const aside = await openAside();
    const heat = within(aside).getByRole('switch', { name: /Mapa de calor da memória/ });
    const labels = within(aside).getByRole('switch', { name: /Rótulos das conexões/ });
    expect(heat.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(heat);
    fireEvent.click(labels);
    expect(heat.getAttribute('aria-checked')).toBe('false');
    expect(labels.getAttribute('aria-checked')).toBe('false');
    await waitFor(() => expect(prefs()).toMatchObject({ heat: false, labels: false }));
  });

  it('favorite is per device (prefs.favorites) and toggles back', async () => {
    mount();
    const aside = await openAside();
    fireEvent.click(within(aside).getByRole('switch', { name: 'Favoritar' }));
    await waitFor(() => expect(prefs().favorites).toEqual([sepseBoard.id]));
    fireEvent.click(within(aside).getByRole('switch', { name: 'Remover de favoritos' }));
    await waitFor(() => expect(prefs().favorites).toEqual([]));
  });

  it('"Vender na Loja" is inert with "Em breve"', async () => {
    mount();
    const aside = await openAside();
    const shop = within(aside).getByRole('button', { name: /Vender na Loja/ }) as HTMLButtonElement;
    expect(shop.disabled).toBe(true);
    expect(shop.textContent).toContain('Em breve');
  });

  it('"Cards em lista" closes the aside and switches to the list (view persisted)', async () => {
    mount();
    const aside = await openAside();
    fireEvent.click(within(aside).getByRole('button', { name: /Cards em lista/ }));
    expect(await screen.findByRole('region', { name: 'Cards em ordem de prioridade' })).toBeTruthy();
    await waitFor(() => expect(prefs().view).toBe('list'));
    expect(screen.queryByRole('dialog', { name: 'Menu do mapa' })).toBeNull();
  });

  it('duplicate calls the API and goes to the copy', async () => {
    mount();
    const aside = await openAside();
    fireEvent.click(within(aside).getByRole('button', { name: 'Duplicar' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/mapas/11111111-1111-4111-8111-111111111111'));
  });

  it('delete needs the map name typed; archive goes back to Meus mapas', async () => {
    mount();
    let aside = await openAside();
    fireEvent.click(within(aside).getByRole('button', { name: 'Excluir' }));
    const dlg = await screen.findByRole('dialog', { name: /Excluir/ });
    const del = within(dlg).getByRole('button', { name: 'Excluir' }) as HTMLButtonElement;
    expect(del.disabled).toBe(true);
    fireEvent.change(within(dlg).getByLabelText('Para confirmar, digite o nome do mapa'), { target: { value: sepseBoard.title } });
    expect(del.disabled).toBe(false);
    fireEvent.keyDown(dlg, { key: 'Escape' });
    aside = await openAside();
    fireEvent.click(within(aside).getByRole('button', { name: 'Arquivar' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: /Arquivar/ })).getByRole('button', { name: 'Arquivar' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/mapas'));
  });
});

describe('list mode (F23 FR-17)', () => {
  it('orders by urgency, is a real list, and a row returns to the canvas with the card selected', async () => {
    window.localStorage.setItem(MOBILE_MAP_PREFS_KEY, JSON.stringify({ view: 'list' }));
    mount();
    const list = await screen.findByRole('region', { name: 'Cards em ordem de prioridade' });
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/retrievability/)));
    const rows = await within(list).findAllByRole('listitem');
    expect(rows.length).toBe(sepseCards.length);
    const order = ['review', 'watch', 'steady', 'unknown'];
    await waitFor(() => {
      const states = within(list).getAllByRole('listitem').map((r) => /Revisitar|Acompanhar|Mais estável|Sem revisões/.exec(r.textContent ?? '')?.[0]);
      const idx = states.map((s) => order.indexOf({ Revisitar: 'review', Acompanhar: 'watch', 'Mais estável': 'steady', 'Sem revisões': 'unknown' }[s ?? 'Sem revisões']!));
      expect(idx).toEqual([...idx].sort((a, b) => a - b));
      expect(idx[0]).toBe(0);
    });
    fireEvent.click(within(rows[0]!).getByRole('button'));
    await waitFor(() => expect(prefs().view).toBe('canvas'));
    expect(await screen.findByRole('region', { name: 'Mapa visual' })).toBeTruthy();
  });

  it('the bar toggle goes back and forth', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar cards em lista' }));
    expect(await screen.findByRole('region', { name: 'Cards em ordem de prioridade' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao mapa' }));
    expect(await screen.findByRole('region', { name: 'Mapa visual' })).toBeTruthy();
  });
});
