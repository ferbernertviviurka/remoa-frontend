import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoardGraph, Card } from '@remoa/contracts';
import { retrievabilityFixture, sepseBoard, sepseCards, sepseEdges } from '@remoa/contracts/mocks';
import { ToastProvider } from '@remoa/ui';
import { ChallengeProvider } from '@/features/challenge/provider';
import { clearCardDetails } from './card-detail';

const api = vi.fn();
const replace = vi.fn();
const push = vi.fn();
let search = new URLSearchParams();
let startItems: unknown[] = [];
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: () => undefined }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, refresh: () => undefined }),
  usePathname: () => `/mapas/${sepseBoard.id}`,
  useSearchParams: () => search,
}));

const { MapCanvas } = await import('./map-canvas');

beforeAll(() => {
  // React Flow measures nodes with ResizeObserver and reads DOMMatrix for the viewport.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  globalThis.DOMMatrixReadOnly ??= class {
    m22 = 1;
    constructor(t?: string) {
      const scale = t?.match(/scale\(([1-9.]+)\)/)?.[1];
      this.m22 = scale ? +scale : 1;
    }
  } as unknown as typeof DOMMatrixReadOnly;
});

const graph: BoardGraph = {
  board: sepseBoard,
  cards: sepseCards.map((c): Card => ({ ...c, preview: undefined })),
  edges: sepseEdges,
};

beforeEach(() => {
  search = new URLSearchParams();
  startItems = [];
  clearCardDetails();
  window.localStorage.clear();
  api.mockImplementation(async (path: string) => {
    if (path === '/v1/challenge/start') return { ok: true, data: { sessionId: 's1', items: startItems } };
    if (path.startsWith('/v1/review/retrievability')) return { ok: true, data: retrievabilityFixture };
    if (path.startsWith('/v1/cards/')) return { ok: true, data: sepseCards.find((c) => path.endsWith(c.id)) };
    if (path.startsWith('/v1/boards/')) return { ok: true, data: { ...sepseBoard, title: 'Sepse grave' } };
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
        <MapCanvas graph={graph} />
      </ChallengeProvider>
    </ToastProvider>,
  );
const key = (k: string) => fireEvent.keyDown(document.activeElement ?? document.body, { key: k });
// React Flow keeps unmeasured nodes `visibility: hidden` (no layout in jsdom): role queries skip them, so query the label.
const selectBtn = (title: string) => {
  const b = document.querySelector<HTMLButtonElement>(`.react-flow__node button[aria-label="Selecionar ${title}"]`);
  if (!b) throw new Error(`no node ${title}`);
  return b;
};
const nodeOf = (title: string) => selectBtn(title).closest('article')!;

describe('editor v2 (T5)', () => {
  it('camadas trocam cor e rodapé sem remontar nem mudar o tamanho do nó', async () => {
    mount();
    await waitFor(() => expect(nodeOf('Sepse')).toHaveTextContent('Revisitar · 62%'));
    const before = nodeOf('Sepse');
    const size = before.className.match(/w-\[\d+px\] h-\[\d+px\]/)?.[0];
    expect(before).toHaveAttribute('data-layer', 'recall');
    expect(screen.getByRole('list', { name: 'Legenda dos estados' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Estrutura' }));
    const after = nodeOf('Sepse');
    expect(after).toBe(before); // same DOM node: no remount, no reflow
    expect(after).toHaveAttribute('data-layer', 'structure');
    expect(after.className).toContain(size);
    expect(after).toHaveTextContent('5 conexões');
    expect(screen.getByRole('button', { name: 'Estrutura' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('list', { name: 'Legenda dos estados' })).toBeNull(); // legend only on Lembrança

    fireEvent.click(screen.getByRole('button', { name: 'Cobertura' }));
    expect(nodeOf('Sepse')).toHaveTextContent('Fora da matriz do Enamed'); // fixture board has no matrix item
  });

  it('painel sem seleção: resumo do mapa; com seleção: abas operáveis por teclado', async () => {
    mount();
    const panel = screen.getByRole('complementary', { name: 'Painel do mapa' });
    expect(within(panel).getByText('Sobre este mapa')).toBeInTheDocument();
    expect(within(panel).getByText('cards')).toBeInTheDocument();

    fireEvent.click(selectBtn('Sepse'));
    const tabs = within(panel).getByRole('tablist', { name: 'Seções do card' });
    expect(within(tabs).getByRole('tab', { name: 'Conteúdo' })).toHaveAttribute('aria-selected', 'true');
    expect(within(panel).getByText('Conexões · 5')).toBeInTheDocument();

    within(tabs).getByRole('tab', { name: 'Conteúdo' }).focus();
    key('ArrowRight');
    expect(within(tabs).getByRole('tab', { name: 'Rubrica' })).toHaveFocus();
    await waitFor(() => expect(within(panel).getByRole('tabpanel')).toHaveTextContent('Essencial'));
    key('End');
    expect(within(panel).getByRole('tabpanel')).toHaveTextContent('Nenhuma tentativa ainda');
    key('ArrowLeft');
    expect(within(panel).getByRole('tabpanel')).toHaveTextContent('Marco temporal');
    expect(within(panel).getByRole('tabpanel')).toHaveTextContent('Enamed 2026.2');

    fireEvent.click(within(panel).getByRole('button', { name: 'Fechar painel do card' }));
    expect(within(panel).getByText('Sobre este mapa')).toBeInTheDocument();
  });

  it('⌘K abre a paleta com foco no campo; filtra; Enter executa; Esc fecha', async () => {
    mount();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    const input = await screen.findByRole('combobox', { name: 'Buscar comando' });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: 'estrutura' } });
    key('Enter');
    await waitFor(() => expect(screen.queryByRole('combobox')).toBeNull());
    expect(screen.getByRole('button', { name: 'Estrutura' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    await screen.findByRole('combobox');
    key('Escape');
    await waitFor(() => expect(screen.queryByRole('combobox')).toBeNull());
  });

  it('Desafiar este mapa entra no modo desafio pela URL', async () => {
    mount();
    fireEvent.click(screen.getAllByRole('button', { name: 'Desafiar este mapa' })[0]!); // header first
    expect(replace).toHaveBeenCalledWith(`/mapas/${sepseBoard.id}?modo=desafio`, { scroll: false });
  });

  it('modo desafio (?modo=desafio): sem pulse, sem legenda, inicia a sessão do mapa; "Sair do desafio" volta', async () => {
    search = new URLSearchParams('modo=desafio');
    mount();
    await waitFor(() => expect(nodeOf('Sepse')).toHaveTextContent('Revisitar · 62%'));
    expect(document.querySelector('.cv-pulse')).toBeNull();
    expect(screen.queryByRole('list', { name: 'Legenda dos estados' })).toBeNull();
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/challenge/start', expect.objectContaining({ method: 'POST' })));
    expect(JSON.parse(api.mock.calls.find((c) => c[0] === '/v1/challenge/start')![1].body)).toEqual({ kind: 'board', boardId: sepseBoard.id });
    fireEvent.click(screen.getAllByRole('button', { name: 'Sair do desafio' })[0]!); // header first
    expect(replace).toHaveBeenCalledWith(`/mapas/${sepseBoard.id}`, { scroll: false });
  });

  const item = (over: Record<string, unknown>) => ({ subId: null, boardId: sepseBoard.id, grading: 'none', options: ['a', 'b', 'c', 'd'], context: { neighbors: [] }, ...over });
  const opacityOf = (title: string) => nodeOf(title).className;

  it('desafio: papéis target/vizinho/apagado; o rótulo da conexão perguntada não aparece no DOM antes do /answer', async () => {
    search = new URLSearchParams('modo=desafio');
    const [choque, sepse] = [sepseCards.find((c) => c.title === 'Choque séptico')!, sepseCards.find((c) => c.title === 'Sepse')!];
    startItems = [item({ id: choque.id, cardId: choque.id, cardTitle: choque.title, mode: 'edge', prompt: 'x', context: { neighbors: [], edge: { fromTitle: sepse.title, toTitle: choque.title } } })];
    mount();
    const panel = screen.getByRole('complementary', { name: 'Painel do mapa' });
    await within(panel).findByText('O que liga Sepse a Choque séptico?');
    expect(opacityOf('Choque séptico')).toContain('opacity-100');
    expect(opacityOf('Sepse')).toContain('opacity-50'); // the one neighbour
    expect(opacityOf('qSOFA')).toContain('opacity-[.18]');
    expect(document.body.textContent).not.toContain('pode evoluir para');
    expect(api.mock.calls.some((c) => String(c[0]).endsWith('/answer'))).toBe(false);
  });

  it('desafio next_step: só os passos revelados e o passo oculto mascarado', async () => {
    search = new URLSearchParams('modo=desafio');
    const pacote = sepseCards.find((c) => c.type === 'flow')!;
    const steps = (pacote.payload as { steps: { text: string }[] }).steps.map((x) => x.text);
    startItems = [item({ id: `${pacote.id}:step-3`, cardId: pacote.id, cardTitle: pacote.title, subId: 'step-3', mode: 'next_step', prompt: `${pacote.title}: qual é o passo 3?`, context: { neighbors: [], revealed: steps.slice(0, 2) } })];
    mount();
    await screen.findByText(/qual é o passo 3/);
    await waitFor(() => expect(nodeOf(pacote.title)).toHaveTextContent('Passo oculto: responda no painel'));
    const node = nodeOf(pacote.title);
    expect(node).toHaveTextContent(steps[0]!);
    expect(node).toHaveTextContent(steps[1]!);
    for (const later of steps.slice(2)) expect(document.body.textContent).not.toContain(later);
  });

  it('desafio hidden_card: o verso (resposta) e o título-resposta não aparecem no nó', async () => {
    search = new URLSearchParams('modo=desafio');
    const sepse = sepseCards.find((c) => c.title === 'Sepse')!;
    startItems = [item({ id: sepse.id, cardId: sepse.id, cardTitle: '', mode: 'hidden_card', prompt: 'Qual o conceito?' })];
    mount();
    await screen.findByText('Qual o conceito?');
    await waitFor(() => expect(nodeOf('Conceito oculto')).toBeTruthy());
    expect(nodeOf('Conceito oculto')).not.toHaveTextContent(sepse.back!.slice(0, 30));
    expect(document.querySelector('.react-flow__node button[aria-label="Selecionar Sepse"]')).toBeNull();
  });

  it('título editável no lugar: Enter salva (PATCH), Esc cancela', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: /^Sepse Renomear mapa$/ }));
    const input = screen.getByRole('textbox', { name: 'Nome do mapa' });
    fireEvent.change(input, { target: { value: 'Sepse grave' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(api).toHaveBeenCalledWith(`/v1/boards/${sepseBoard.id}`, { method: 'PATCH', body: JSON.stringify({ title: 'Sepse grave' }) }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sepse grave');

    api.mockClear();
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });
    fireEvent.click(screen.getByRole('button', { name: /^Sepse grave Renomear mapa$/ }));
    const again = screen.getByRole('textbox', { name: 'Nome do mapa' });
    fireEvent.change(again, { target: { value: 'Outro nome' } });
    fireEvent.keyDown(again, { key: 'Escape' });
    expect(api).not.toHaveBeenCalledWith(`/v1/boards/${sepseBoard.id}`, expect.anything());
  });

  it('zoom: botões presos a 60–140%', async () => {
    mount();
    const zoom = screen.getByRole('group', { name: 'Controles de zoom' });
    const step = async (name: string, times: number) => {
      for (let i = 0; i < times; i++) {
        const b = within(zoom).getByRole('button', { name });
        if ((b as HTMLButtonElement).disabled) return;
        fireEvent.click(b);
        await new Promise((r) => setTimeout(r, 250)); // 150 ms zoom transition
      }
    };
    await step('Aumentar zoom', 8);
    expect(zoom).toHaveTextContent('140%');
    expect(within(zoom).getByRole('button', { name: 'Aumentar zoom' })).toBeDisabled();
    await step('Diminuir zoom', 12);
    expect(zoom).toHaveTextContent('60%');
    expect(within(zoom).getByRole('button', { name: 'Diminuir zoom' })).toBeDisabled();
  }, 15_000);
});
