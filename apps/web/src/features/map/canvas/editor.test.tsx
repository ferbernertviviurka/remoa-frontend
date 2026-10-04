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
  usePathname: () => `/app/mapas/${sepseBoard.id}`,
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

  it('D-098: sem seleção não há painel; com seleção, abas operáveis por teclado; fechar, Esc e clique no fundo escondem', async () => {
    mount();
    // G06: the panel plays a closing animation (data-state="closed") before it unmounts
    const aside = () => screen.queryByRole('complementary', { name: 'Painel do mapa' });
    const panel = () => (aside()?.dataset.state === 'open' ? aside() : null);
    expect(aside()).toBeNull();

    fireEvent.click(selectBtn('Sepse'));
    expect(aside()).toHaveAttribute('data-state', 'open');
    const tabs = within(panel()!).getByRole('tablist', { name: 'Seções do card' });
    expect(within(tabs).getByRole('tab', { name: 'Conteúdo' })).toHaveAttribute('aria-selected', 'true');
    expect(within(panel()!).getByText('Conexões · 5')).toBeInTheDocument();

    within(tabs).getByRole('tab', { name: 'Conteúdo' }).focus();
    key('ArrowRight');
    expect(within(tabs).getByRole('tab', { name: 'Rubrica' })).toHaveFocus();
    await waitFor(() => expect(within(panel()!).getByRole('tabpanel')).toHaveTextContent('Essencial'));
    key('End');
    expect(within(panel()!).getByRole('tabpanel')).toHaveTextContent('Nenhuma tentativa ainda');
    key('ArrowLeft');
    expect(within(panel()!).getByRole('tabpanel')).toHaveTextContent('Marco temporal');
    expect(within(panel()!).getByRole('tabpanel')).toHaveTextContent('Enamed 2026.2');

    fireEvent.click(within(panel()!).getByRole('button', { name: 'Fechar painel do card' }));
    expect(aside()).toHaveAttribute('data-state', 'closed');
    expect(aside()).toHaveTextContent('Sepse'); // still the card it had while it slides out
    await waitFor(() => expect(aside()).toBeNull());

    fireEvent.click(selectBtn('Sepse'));
    expect(panel()).not.toBeNull();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(panel()).toBeNull();

    fireEvent.click(selectBtn('Sepse'));
    expect(panel()).not.toBeNull();
    fireEvent.click(document.querySelector('.react-flow__pane')!);
    await waitFor(() => expect(panel()).toBeNull());
  });

  it('D-097: "Ver resposta" vira o card para o verso sem selecionar nem abrir o painel; "Ver pergunta" volta', async () => {
    mount();
    const sepse = sepseCards.find((c) => c.title === 'Sepse')!;
    const answer = sepse.back!.replace(/[*_]/g, '').slice(0, 20);
    const node = () => nodeOf('Sepse');
    expect(node()).not.toHaveTextContent(answer); // the front never carries the answer
    fireEvent.click(within(node()).getByText('Ver resposta'));
    await waitFor(() => expect(node()).toHaveTextContent(answer));
    expect(node()).toHaveAttribute('data-flipped', 'true');
    expect(screen.queryByRole('complementary', { name: 'Painel do mapa' })).toBeNull();
    expect(selectBtn('Sepse')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(within(node()).getByText('Ver pergunta'));
    expect(node()).not.toHaveAttribute('data-flipped');
  });

  it('Ligar dois cards: clique na origem, depois no destino, enfileira createEdge', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      mount();
      fireEvent.click(screen.getByRole('button', { name: 'Ligar dois cards' }));
      expect(screen.getByText('Clique no card de origem.')).toBeInTheDocument();
      fireEvent.click(selectBtn('qSOFA'));
      expect(screen.getByText('Agora clique no card de destino.')).toBeInTheDocument();
      fireEvent.click(selectBtn('Lactato'));
      expect(screen.getByText('Clique no card de origem.')).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      const ids = new Map(sepseCards.map((c) => [c.title, c.id]));
      const sent = api.mock.calls.filter((c) => c[0] === '/v1/boards/ops').flatMap((c) => JSON.parse(c[1].body).ops);
      expect(sent).toContainEqual(expect.objectContaining({ op: 'createEdge', edge: expect.objectContaining({ fromCardId: ids.get('qSOFA'), toCardId: ids.get('Lactato'), label: null }) }));
    } finally {
      vi.useRealTimers();
    }
  });

  it('pinça: ctrl+roda fora do pane (sobre as camadas) e gesto do Safari dão zoom no mapa, não na página; 10–140%', async () => {
    mount();
    const zoom = screen.getByRole('group', { name: 'Controles de zoom' });
    await waitFor(() => expect(zoom).toHaveTextContent(/\d+%/));
    const start = zoom.textContent;
    const over = screen.getByRole('button', { name: 'Estrutura' });
    const wheel = new WheelEvent('wheel', { deltaY: -40, ctrlKey: true, bubbles: true, cancelable: true });
    over.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true);
    await waitFor(() => expect(zoom.textContent).not.toBe(start));
    const section = screen.getByRole('region', { name: /Mapa/ });
    const gesture = (type: string, scale: number) => {
      const e = Object.assign(new Event(type, { bubbles: true, cancelable: true }), { scale, clientX: 0, clientY: 0 });
      section.dispatchEvent(e);
      return e;
    };
    expect(gesture('gesturestart', 1).defaultPrevented).toBe(true);
    gesture('gesturechange', 10);
    await waitFor(() => expect(zoom).toHaveTextContent('140%'));
    gesture('gesturestart', 1);
    gesture('gesturechange', 0.01);
    await waitFor(() => expect(zoom).toHaveTextContent('10%'));
  });

  const sentOps = () => api.mock.calls.filter((c) => c[0] === '/v1/boards/ops').flatMap((c) => JSON.parse(c[1].body).ops as { op: string }[]);
  const flushQueue = () => act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });

  it('G06: "Conteúdo" na barra cria um card note: sem virar, sem rubrica, sem "Revisar este card"; a paleta lista os 5 tipos', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      mount();
      const bar = screen.getByRole('toolbar', { name: 'Ferramentas do mapa' });
      expect(within(bar).getAllByRole('button').map((b) => b.getAttribute('aria-label')).filter((l) => l?.startsWith('Adicionar'))).toEqual([
        'Adicionar Pergunta e Resposta', 'Adicionar Conteúdo', 'Adicionar fluxograma', 'Adicionar caso clínico', 'Adicionar imagem',
      ]);
      fireEvent.click(within(bar).getByRole('button', { name: 'Adicionar Conteúdo' }));
      const node = nodeOf('Novo conteúdo');
      expect(node).toHaveAttribute('data-type', 'note');
      expect(within(node).queryByRole('button', { name: 'Ver resposta' })).toBeNull();
      const panel = screen.getByRole('complementary', { name: 'Painel do mapa' });
      expect(within(panel).getByText('Conteúdo', { selector: 'span' })).toBeInTheDocument(); // eyebrow
      expect(within(panel).queryByRole('button', { name: 'Revisar este card' })).toBeNull();
      await flushQueue();
      expect(sentOps()).toContainEqual(expect.objectContaining({ op: 'createCard', card: expect.objectContaining({ type: 'note', title: 'Novo conteúdo' }) }));

      fireEvent.keyDown(window, { key: 'k', metaKey: true });
      const input = await screen.findByRole('combobox', { name: 'Buscar comando' });
      fireEvent.change(input, { target: { value: 'Novo Conteúdo' } });
      expect(screen.getByRole('option', { name: /Novo Conteúdo/ })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('G06 (D-202): card com tamanho próprio desenha esse tamanho; alças só no selecionado; "Restaurar tamanho padrão" enfileira resizeCards null', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const original = graph.cards;
    graph.cards = original.map((c) => (c.title === 'qSOFA' ? { ...c, size: { w: 320, h: 240 } } : c));
    try {
      mount();
      expect(nodeOf('qSOFA')).toHaveStyle({ width: '320px', height: '240px' });
      expect(document.querySelectorAll('.react-flow__resize-control')).toHaveLength(0);
      fireEvent.click(selectBtn('qSOFA'));
      expect(document.querySelectorAll('.react-flow__node.selected .react-flow__resize-control')).toHaveLength(4);
      const panel = screen.getByRole('complementary', { name: 'Painel do mapa' });
      fireEvent.keyDown(within(panel).getByRole('button', { name: 'Mais ações de qSOFA' }), { key: 'Enter' });
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Restaurar tamanho padrão' }));
      expect(nodeOf('qSOFA').style.width).toBe('');
      await flushQueue();
      const id = sepseCards.find((c) => c.title === 'qSOFA')!.id;
      expect(sentOps()).toContainEqual(expect.objectContaining({ op: 'resizeCards', sizes: [{ cardId: id, size: null }] }));
      fireEvent.keyDown(document.body, { key: 'z', metaKey: true }); // undo brings the size back
      expect(nodeOf('qSOFA')).toHaveStyle({ width: '320px' });
    } finally {
      graph.cards = original;
      vi.useRealTimers();
    }
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
    expect(replace).toHaveBeenCalledWith(`/app/mapas/${sepseBoard.id}?modo=desafio`, { scroll: false });
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
    expect(replace).toHaveBeenCalledWith(`/app/mapas/${sepseBoard.id}`, { scroll: false });
  });

  const item = (over: Record<string, unknown>) => ({ subId: null, boardId: sepseBoard.id, grading: 'none', options: ['a', 'b', 'c', 'd'], context: { neighbors: [] }, ...over });
  const focusCard = () => document.querySelector<HTMLElement>('[data-testid="focus-card"]');

  it('desafio (D-097): canvas desfocado num filtro só; o card em foco nítido por cima, só a frente; o rótulo perguntado não aparece no DOM antes do /answer', async () => {
    search = new URLSearchParams('modo=desafio');
    const [choque, sepse] = [sepseCards.find((c) => c.title === 'Choque séptico')!, sepseCards.find((c) => c.title === 'Sepse')!];
    startItems = [item({ id: choque.id, cardId: choque.id, cardTitle: choque.title, mode: 'edge', prompt: 'x', context: { neighbors: [], edge: { fromTitle: sepse.title, toTitle: choque.title } } })];
    mount();
    const panel = screen.getByRole('complementary', { name: 'Painel do mapa' });
    await within(panel).findByText('O que liga Sepse a Choque séptico?');
    const section = screen.getByRole('region', { name: /Mapa/ });
    expect(section).toHaveAttribute('data-focus'); // editor.css: .cv-editor[data-focus] .react-flow__viewport { filter: blur }
    await waitFor(() => expect(focusCard()).not.toBeNull());
    expect(focusCard()).toHaveAttribute('aria-hidden', 'true');
    expect(focusCard()).toHaveTextContent('Choque séptico');
    expect(document.querySelectorAll('[data-testid="focus-card"] article')).toHaveLength(1);
    // no neighbour/dim opacity any more, and no flip anywhere: the answer side is off in the challenge
    expect(document.querySelector('.react-flow__node article.opacity-50, .react-flow__node article.opacity-\\[\\.18\\]')).toBeNull();
    expect(screen.queryByText('Ver resposta')).toBeNull();
    expect(document.body.textContent).not.toContain('pode evoluir para');
    expect(choque.back && document.body.textContent).not.toContain(choque.back!.slice(0, 30));
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
    await waitFor(() => expect(focusCard()).toHaveTextContent('Conceito oculto'));
    expect(document.body.textContent).not.toContain(sepse.back!.slice(0, 30));
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

  it('zoom: botões presos a 10–140%', async () => {
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
    await step('Diminuir zoom', 14);
    expect(zoom).toHaveTextContent('10%');
    expect(within(zoom).getByRole('button', { name: 'Diminuir zoom' })).toBeDisabled();
  }, 15_000);
});
