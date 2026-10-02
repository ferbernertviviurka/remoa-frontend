import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { BoardSummary, CoverageRow, MatrixItem } from '@remoa/contracts';
import { ToastProvider } from '@remoa/ui';
import { computeGaps, sortWeakestFirst } from './coverage-logic';
import { CoverageView, catalogCoverage } from './coverage-view';

const track = vi.fn();
const api = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const item = (id: string, title: string, parentId: string | null = null): MatrixItem => ({ id, area: 'CM', code: id, title, parentId, targetCards: 40 });
const items = [item('p', 'Infectologia'), item('a', 'Sepse', 'p'), item('b', 'Pneumonia', 'p'), item('c', 'Asma'), item('d', 'DPOC')];
const row = (id: string, title: string, coverage: number, avg: number | null): CoverageRow => ({ matrixItemId: id, area: 'CM', code: id, title, boards: 2, cards: 10, targetCards: 40, coverage, avgRetrievability: avg });
const rows = [row('a', 'Sepse', 60, 0.72), row('c', 'Asma', 20, null)];
const board = (id: string, title: string, matrixItemId: string | null): BoardSummary => ({ id, title, area: 'CM', status: 'private', updatedAt: new Date('2026-01-01'), cardCount: 4, edgeCount: 1, matrixItemId, access: 'owner', dueCount: 0, stateCounts: { review: 0, watch: 0, steady: 0, unknown: 0 }, preview: { nodes: [], edges: [] } });
const boards = [board('b1', 'Sepse da UTI', 'a'), board('b2', 'Meu mapa solto', null), board('b3', 'Asma resumo', 'c')];
const props = { rows, items, summary: { dueToday: 5 }, boards };
const ui = (p = props) => <ToastProvider closeLabel="Fechar" viewportLabel="Avisos"><CoverageView {...p} /></ToastProvider>;

describe('coverage logic', () => {
  it('gaps are topics (not groups) without a linked map, grouped by parent', () => {
    const g = computeGaps(items, rows);
    expect(g.map((x) => [x.group?.title ?? null, x.topics.map((i) => i.title)])).toEqual([['Infectologia', ['Pneumonia']], [null, ['DPOC']]]);
  });
  it('sorts weakest coverage first', () => {
    expect(sortWeakestFirst(rows).map((r) => r.title)).toEqual(['Asma', 'Sepse']);
  });
});

describe('CoverageView', () => {
  it('catalog coverage is the mean over all topics of the area (groups excluded), unlinked counting 0', () => {
    expect(catalogCoverage(items, rows)).toBe(20); // (60 + 20) / 4 topics; group 'p' excluded
    expect(catalogCoverage([], rows)).toBe(0);
  });

  it('hero shows the overall % as text and counts, and the footer keeps the non-INEP caveat', () => {
    render(ui());
    expect(screen.getByText(/dividido pela meta do tema/)).toBeInTheDocument();
    const summary = screen.getByRole('region', { name: 'Resumo da cobertura' });
    expect(within(summary).getByText('20%')).toBeInTheDocument();
    expect(within(summary).getByRole('img', { name: '20% da matriz coberta' })).toBeInTheDocument();
    expect(within(summary).getByText('0 cobertos · 2 em andamento · 2 sem mapa')).toBeInTheDocument();
    expect(within(summary).getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/não uma lista oficial do INEP, e não indicam peso de prova/)).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Grande área' })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('coverage_viewed', {});
  });

  it('priority gaps link to Novo mapa; groups list every topic with state text, weakest first, and open-map links', () => {
    render(ui());
    expect(screen.getByText(/2 de 4 temas sem mapa/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Criar mapa para Pneumonia' })[0]).toHaveAttribute('href', '/mapas/novo?item=b');
    const infecto = screen.getByRole('group', { name: 'Infectologia' });
    expect(within(infecto).getAllByRole('listitem').map((li) => /Pneumonia|Sepse/.exec(li.textContent ?? '')?.[0])).toEqual(['Pneumonia', 'Sepse']);
    const sepse = within(infecto).getByText('Sepse').closest('li')!;
    expect(within(sepse).getByText('Em andamento')).toBeInTheDocument();
    expect(within(sepse).getByText('60%')).toBeInTheDocument();
    expect(within(sepse).getByText('lembrança 72%')).toBeInTheDocument();
    expect(within(sepse).getByRole('link', { name: 'Abrir mapa de Sepse' })).toHaveAttribute('href', '/mapas/b1');
    const pn = within(infecto).getByText('Pneumonia').closest('li')!;
    expect(within(pn).getByText('Sem mapa')).toBeInTheDocument();
    expect(within(pn).getByRole('button', { name: 'Ligar um mapa que já tenho a Pneumonia' })).toBeInTheDocument();
  });

  it('filters by state and searches by topic (accent-insensitive); no match shows a clear action', () => {
    render(ui());
    fireEvent.click(screen.getByRole('button', { name: /^Sem mapa/ }));
    expect(screen.getByRole('button', { name: /^Sem mapa/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('link', { name: 'Abrir mapa de Sepse' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ligar um mapa que já tenho a DPOC' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Todos/ }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar tema' }), { target: { value: 'SEPSE' } });
    expect(screen.getByRole('link', { name: 'Abrir mapa de Sepse' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ligar um mapa que já tenho a DPOC/ })).toBeNull();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar tema' }), { target: { value: 'zzz' } });
    expect(screen.getByText('Nenhum tema encontrado com esse filtro.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getByRole('button', { name: /Ligar um mapa que já tenho a DPOC/ })).toBeInTheDocument();
  });

  it('area without catalog items shows its own empty message', () => {
    render(ui({ ...props, items: [], rows: [] }));
    expect(screen.getByText('Esta área ainda não tem temas na matriz do Remoa.')).toBeInTheDocument();
  });

  it('link dialog offers only unlinked maps; picking one links, fires the event and moves the topic to in-progress', async () => {
    api.mockImplementation(async (path: string, init?: RequestInit) => {
      if (init?.method === 'POST') return { ok: true, data: {} };
      if (path === '/v1/coverage') return { ok: true, data: [...rows, row('b', 'Pneumonia', 5, null)] };
      return { ok: true, data: boards.map((b) => (b.id === 'b2' ? { ...b, matrixItemId: 'b' } : b)) };
    });
    render(ui());
    fireEvent.click(screen.getByRole('button', { name: 'Ligar um mapa que já tenho a Pneumonia' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: /Ligar Sepse da UTI/ })).toBeNull(); // already linked elsewhere
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ligar Meu mapa solto' }));
    expect(api).toHaveBeenCalledWith('/v1/matrix/links', { method: 'POST', body: JSON.stringify({ boardId: 'b2', matrixItemId: 'b' }) });
    await waitFor(() => expect(track).toHaveBeenCalledWith('board_linked_to_matrix', { count: 1, suggestedCount: 0 }));
    await waitFor(() => expect(screen.getByRole('link', { name: 'Abrir mapa de Pneumonia' })).toBeInTheDocument());
    expect(screen.getByText(/1 de 4 temas sem mapa/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('empty state: explains, suggests the 3 highest-target topics with both actions and links to Meus mapas', () => {
    const big = [...items, { ...item('e', 'Cardiologia'), targetCards: 90 }];
    render(ui({ ...props, items: big, rows: [], boards: [] }));
    expect(screen.getByText(/ainda não ligou nenhum mapa/)).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Temas para começar' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('Cardiologia');
    expect(screen.getAllByRole('button', { name: /^Ligar um mapa que já tenho a / })).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Meus mapas' })).toHaveAttribute('href', '/mapas');
  });
});
