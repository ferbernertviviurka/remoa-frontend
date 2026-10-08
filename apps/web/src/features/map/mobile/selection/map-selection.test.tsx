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
const { peekView } = await import('./use-map-selection');

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  globalThis.DOMMatrixReadOnly ??= class {
    m22 = 1;
  } as unknown as typeof DOMMatrixReadOnly;
  // jsdom has no PointerEvent: without it fireEvent drops clientX and pointerId
  window.PointerEvent ??= class extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  } as unknown as typeof PointerEvent;
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
    for (const n of ['Revisar este conceito', 'Desafiar', 'Editar card', 'Conectar a outro card', 'Fechar']) expect(screen.getByRole('button', { name: n })).toBeTruthy();
    fireEvent.click(card(1));
    await waitFor(() => expect(screen.getByRole('region', { name: 'Card selecionado' }).textContent).toContain(sepseCards[1]!.title));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('region', { name: 'Card selecionado' })).toBeNull();
  });

  it('D-1572: card conceito tem "Ver resposta", que mostra o verso no próprio peek', async () => {
    mount();
    fireEvent.click(card(0));
    fireEvent.click(await screen.findByRole('button', { name: 'Ver resposta' }));
    expect(screen.getByRole('region', { name: 'Resposta' })).toHaveTextContent(sepseCards[0]!.back!);
  });

  it('D-1572: o card tocado fica inteiro entre o topo e o peek (Safari: nada por baixo do cartão de ações)', () => {
    const fits = (card: { w: number; h: number }, peekTop: number) => {
      const v = peekView(card, 390, 844, peekTop);
      const top = 844 / 2 - v.shift * v.zoom - (card.h * v.zoom) / 2;
      return { ...v, top, bottom: top + card.h * v.zoom };
    };
    const small = fits({ w: 296, h: 200 }, 430);
    expect(small.zoom).toBe(1);
    expect(small.top).toBeGreaterThanOrEqual(80);
    expect(small.bottom).toBeLessThanOrEqual(430 - 12);
    const tall = fits({ w: 392, h: 600 }, 430);
    expect(tall.zoom).toBeLessThan(1);
    expect(tall.bottom).toBeLessThanOrEqual(430 - 12 + 0.01);
    expect(peekView({ w: 296, h: 200 }, 390, 844, null).zoom).toBe(1); // peek ainda não medido: usa 60% da tela
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

describe('alças do card selecionado (D-1207)', () => {
  const node = (i: number) => document.querySelector<HTMLElement>(`.react-flow__node[data-id="${sepseCards[i]!.id}"]`)!;
  const handle = (i: number, name: RegExp) => [...node(i).querySelectorAll<HTMLElement>('button')].find((b) => name.test(b.getAttribute('aria-label') ?? ''));

  it('só o selecionado mostra as alças; a bolinha entra no modo conectar e os outros cards viram destino', async () => {
    mount();
    expect(handle(0, /^Conectar/)).toBeUndefined();
    fireEvent.click(card(0));
    await screen.findByRole('region', { name: 'Card selecionado' });
    expect(handle(1, /^Conectar/)).toBeUndefined();
    fireEvent.click(handle(0, /^Conectar/)!);
    expect(screen.getByText(/Toque no card que se liga a/)).toBeTruthy();
    expect(card(1).dataset.connectTarget).toBe('true');
    expect(card(0).dataset.connectTarget).toBeUndefined();
    expect(handle(0, /^Conectar/)).toBeUndefined(); // no handles while connecting
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar conexão' }));
    expect(card(1).dataset.connectTarget).toBeUndefined();
  });

  it('arrastar a alça do canto muda o tamanho ao vivo, salva um resizeCards ao soltar e desfazer volta', async () => {
    mount();
    fireEvent.click(card(0));
    await screen.findByRole('region', { name: 'Card selecionado' });
    const before = parseInt(card(0).style.width, 10);
    const grip = handle(0, /^Redimensionar/)!;
    fireEvent.pointerDown(grip, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(grip, { pointerId: 1, clientX: 400, clientY: 400 });
    const live = parseInt(card(0).style.width, 10);
    expect(live).toBeGreaterThan(before);
    expect(undo().getAttribute('aria-disabled')).toBe('true'); // nothing committed mid-gesture
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(parseInt(card(0).style.width, 10)).toBe(live);
    expect(undo().getAttribute('aria-disabled')).toBeNull();
    fireEvent.click(undo());
    expect(parseInt(card(0).style.width, 10)).toBe(before);
  });

  it('setas no teclado mudam o tamanho em passos de 8 px', async () => {
    mount();
    fireEvent.click(card(0));
    await screen.findByRole('region', { name: 'Card selecionado' });
    const before = parseInt(card(0).style.width, 10);
    fireEvent.keyDown(handle(0, /^Redimensionar/)!, { key: 'ArrowRight' });
    expect(parseInt(card(0).style.width, 10)).toBe(before + 8);
  });
});
