import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoardGraph } from '@remoa/contracts';
import { retrievabilityFixture, sepseBoard, sepseCards, sepseEdges } from '@remoa/contracts/mocks';
import { ToastProvider } from '@remoa/ui';
import { ChallengeProvider } from '@/features/challenge/provider';

const api = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: () => undefined, rememberBoard: () => undefined }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: () => undefined }),
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

const graph: BoardGraph = { board: sepseBoard, cards: sepseCards, edges: sepseEdges };
const mount = () =>
  render(
    <ToastProvider closeLabel="x" viewportLabel="y">
      <ChallengeProvider>
        <MobileMap graph={graph} />
      </ChallengeProvider>
    </ToastProvider>,
  );
// React Flow keeps unmeasured nodes `visibility: hidden` in jsdom: reach the card button through the node, not the a11y tree
const card = (i: number) => document.querySelector<HTMLElement>(`.react-flow__node[data-id="${sepseCards[i]!.id}"] button`)!;
const undo = () => screen.getByRole('button', { name: 'Desfazer' });

describe('peek (FR-8)', () => {
  it('tocar abre o resumo com as ações; o X fecha; tocar em outro card troca', async () => {
    mount();
    expect(screen.queryByRole('region', { name: 'Card selecionado' })).toBeNull();
    fireEvent.click(card(0));
    const peek = await screen.findByRole('region', { name: 'Card selecionado' });
    expect(peek.textContent).toContain(sepseCards[0]!.title);
    for (const n of ['Revisar este conceito', 'Editar card', 'Conectar a outro card', 'Fechar']) expect(screen.getByRole('button', { name: n })).toBeTruthy();
    fireEvent.click(card(1));
    await waitFor(() => expect(screen.getByRole('region', { name: 'Card selecionado' }).textContent).toContain(sepseCards[1]!.title));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('region', { name: 'Card selecionado' })).toBeNull();
  });

  it('Editar abre o editor do card e some com o peek e com a barra', async () => {
    mount();
    fireEvent.click(card(0));
    fireEvent.click(await screen.findByRole('button', { name: 'Editar card' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Card selecionado' })).toBeNull());
    expect(screen.queryByRole('button', { name: 'Criar card' })).toBeNull();
  });
});

describe('conectar por toque (FR-10, Q-086)', () => {
  const start = async () => {
    mount();
    fireEvent.click(card(0));
    fireEvent.click(await screen.findByRole('button', { name: 'Conectar a outro card' }));
  };
  it('entra no modo com a faixa e cancela', async () => {
    await start();
    expect(screen.getByText(/Toque no card que se liga a/).textContent).toContain(sepseCards[0]!.title);
    expect(screen.queryByRole('region', { name: 'Card selecionado' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar conexão' }));
    expect(screen.queryByRole('button', { name: 'Cancelar conexão' })).toBeNull();
  });
  it('tocar no destino cria a conexão e abre o rótulo; pular deixa sem rótulo e desfazer remove', async () => {
    await start();
    const free = sepseCards.findIndex((c) => c.id !== sepseCards[0]!.id && !sepseEdges.some((e) => e.fromCardId === sepseCards[0]!.id && e.toCardId === c.id));
    fireEvent.click(card(free));
    expect(await screen.findByRole('textbox', { name: 'Rótulo (pergunta)' })).toBeTruthy();
    expect(undo().getAttribute('aria-disabled')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Pular' }));
    expect(screen.queryByRole('textbox', { name: 'Rótulo (pergunta)' })).toBeNull();
    fireEvent.click(undo());
    expect(undo().getAttribute('aria-disabled')).toBe('true');
  });
  it('salvar o rótulo vira um passo próprio do histórico', async () => {
    await start();
    const free = sepseCards.findIndex((c) => c.id !== sepseCards[0]!.id && !sepseEdges.some((e) => e.fromCardId === sepseCards[0]!.id && e.toCardId === c.id));
    fireEvent.click(card(free));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Rótulo (pergunta)' }), { target: { value: 'evolui para' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    fireEvent.click(undo()); // the label
    expect(undo().getAttribute('aria-disabled')).toBeNull();
    fireEvent.click(undo()); // the edge
    expect(undo().getAttribute('aria-disabled')).toBe('true');
  });
  it('consigo mesmo e conexão repetida são recusadas com aviso, sem sair do modo', async () => {
    await start();
    fireEvent.click(card(0));
    expect(await screen.findByText('Escolha outro card para conectar.')).toBeTruthy();
    const dup = sepseCards.findIndex((c) => sepseEdges.some((e) => e.fromCardId === sepseCards[0]!.id && e.toCardId === c.id));
    expect(dup).toBeGreaterThan(-1);
    fireEvent.click(card(dup));
    expect(await screen.findByText('Esses dois cards já estão conectados.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar conexão' })).toBeTruthy();
    act(() => undefined);
  });
});
