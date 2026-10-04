import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within, screen, waitFor } from '@testing-library/react';
import type { BoardSummary } from '@remoa/contracts';
import { ToastProvider } from '@remoa/ui';
import { BoardsView } from './boards-view';

const push = vi.fn();
const refresh = vi.fn();
const api = vi.fn();
const track = vi.fn();
let ent: { entitlements: unknown; status: string; refresh: () => Promise<void> } = { entitlements: null, status: 'error', refresh: async () => {} };
vi.mock('@/features/shell/entitlements', () => ({ useEntitlements: () => ent }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));

const board: BoardSummary = { id: 'b1', title: 'Sepse', area: 'CM', status: 'private', updatedAt: new Date('2026-10-01T00:00:00Z'), matrixItemId: null, access: 'owner', cardCount: 1, edgeCount: 2, dueCount: 0, stateCounts: { review: 0, watch: 0, steady: 0, unknown: 1 }, preview: { nodes: [{ x: 0.5, y: 0.5, state: 'unknown' }], edges: [] } };
const view = (boards: BoardSummary[]) =>
  render(
    <ToastProvider closeLabel="Fechar" viewportLabel="Avisos">
      <BoardsView boards={boards} />
    </ToastProvider>,
  );

/** Radix opens its menu on pointerdown/keydown, not click. */
async function openMenu(item: string) {
  const trigger = screen.getByRole('button', { name: 'Mais ações de Sepse' });
  fireEvent.keyDown(trigger, { key: 'Enter' });
  fireEvent.click(await screen.findByRole('menuitem', { name: item }));
}

afterEach(() => {
  ent = { entitlements: null, status: 'error', refresh: async () => {} };
  cleanup();
  vi.clearAllMocks();
});

describe('BoardsView', () => {
  it('FR-19: shows the access badge only when the map is not "Só eu"', () => {
    view([board, { ...board, id: 'b2', title: 'Choque', access: 'password' }, { ...board, id: 'b3', title: 'Lactato', access: 'public' }]);
    expect(screen.getByText('Privado')).toBeInTheDocument();
    expect(screen.getByText('Público')).toBeInTheDocument();
    expect(screen.queryByText('Só eu')).not.toBeInTheDocument();
  });


  it('archives after confirmation and restores with Desfazer', async () => {
    api.mockResolvedValue({ ok: true, data: board });
    view([board]);
    await openMenu('Arquivar');
    expect(api).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Arquivar' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/boards/b1', { method: 'PATCH', body: JSON.stringify({ archived: true }) }));
    fireEvent.click(await screen.findByRole('button', { name: 'Desfazer' }));
    await waitFor(() => expect(api).toHaveBeenLastCalledWith('/v1/boards/b1', { method: 'PATCH', body: JSON.stringify({ archived: false }) }));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('renames and duplicates from the menu', async () => {
    api.mockResolvedValue({ ok: true, data: board });
    view([board]);
    await openMenu('Duplicar');
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/boards/b1/duplicate', { method: 'POST', body: JSON.stringify({ title: 'Sepse (cópia)' }) }));
    await openMenu('Renomear');
    fireEvent.change(screen.getByLabelText('Nome do mapa'), { target: { value: 'Sepse grave' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Renomear' }));
    await waitFor(() => expect(api).toHaveBeenLastCalledWith('/v1/boards/b1', { method: 'PATCH', body: JSON.stringify({ title: 'Sepse grave' }) }));
  });

  it('shows the ICU summary, plural counts, due badge and relative save time', () => {
    view([
      { ...board, cardCount: 1, edgeCount: 2, dueCount: 2, updatedAt: new Date(Date.now() - 3 * 60_000) },
      { ...board, id: 'b2', title: 'Outro', cardCount: 0, edgeCount: 1, updatedAt: new Date(Date.now() - 2 * 86_400_000) },
    ]);
    expect(screen.getByText('2 mapas · 1 card · 2 vencem hoje')).toBeTruthy();
    expect(screen.getByText('1 card · 2 conexões')).toBeTruthy();
    expect(screen.getByText('0 cards · 1 conexão')).toBeTruthy();
    expect(screen.getByText('2 vencem hoje')).toBeTruthy();
    expect(screen.getByText('Em dia')).toBeTruthy();
    expect(screen.getByText('Salvo há 3 min')).toBeTruthy();
    expect(screen.getByText('Salvo há 2 dias')).toBeTruthy();
    expect(screen.getAllByRole('img', { name: /sem revisões/ })).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Abrir Sepse' }).getAttribute('href')).toBe('/app/mapas/b1');
  });

  it('search ignores case and accents; no match shows the empty state with a way to a new map', () => {
    view([{ ...board, title: 'Insuficiência cardíaca' }, { ...board, id: 'b2', title: 'Pneumonia' }]);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar mapa' }), { target: { value: 'INSUFICIENCIA' } });
    expect(screen.getByRole('link', { name: 'Abrir Insuficiência cardíaca' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Abrir Pneumonia' })).toBeNull();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar mapa' }), { target: { value: 'zzz' } });
    expect(screen.getByText('Nenhum mapa encontrado')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo mapa' })[1]!);
    expect(push).toHaveBeenCalledWith('/app/mapas/novo');
  });

  it('area chips carry counts and filter; Todos restores', () => {
    view([board, { ...board, id: 'b2', title: 'Abdome agudo', area: 'CIR' }]);
    const chips = screen.getByRole('group', { name: 'Filtrar por área' });
    expect(within(chips).getByRole('button', { name: /^Todos 2$/ })).toBeTruthy();
    fireEvent.click(within(chips).getByRole('button', { name: /^Cirurgia 1$/ }));
    expect(screen.queryByRole('link', { name: 'Abrir Sepse' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Abrir Abdome agudo' })).toBeTruthy();
    expect(screen.getByText('1 mapa · 1 card · sem vencimentos hoje')).toBeTruthy();
    fireEvent.click(within(chips).getByRole('button', { name: /^Todos/ }));
    expect(screen.getByRole('link', { name: 'Abrir Sepse' })).toBeTruthy();
  });

  it('grid/list toggle swaps layouts and keeps the menu', async () => {
    view([board]);
    expect(screen.getByRole('button', { name: 'Ver em grade' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Ver em lista' }));
    expect(screen.getByRole('button', { name: 'Ver em lista' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Estados')).toBeTruthy(); // list header
    await openMenu('Duplicar');
    await waitFor(() => expect(api).toHaveBeenCalled());
  });

  it('empty library points to Novo mapa', () => {
    view([]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo mapa' })[0]!);
    expect(push).toHaveBeenCalledWith('/app/mapas/novo');
  });
});

describe('BoardsView: Free limit (F14 FR-20/21)', () => {
  const plan = (boards: number | null, usage: number) => {
    ent = { status: 'ready', refresh: async () => {}, entitlements: { plan: boards === null ? 'pro' : 'free', limits: { boards }, usage: { boards: usage } } };
  };
  const maps = (n: number) => Array.from({ length: n }, (_, i) => ({ ...board, id: `b${i}`, title: `Mapa ${i}` }));
  const lockCard = () => screen.queryByText('Limite do plano Free');

  it('Free with 1 map: new-map card with remaining + lock card; header keeps +', () => {
    plan(2, 1);
    view(maps(1));
    expect(screen.getByRole('link', { name: 'Criar um novo mapa' })).toHaveAttribute('href', '/app/mapas/novo');
    expect(screen.getByText('Você ainda pode criar 1 mapa no plano Free.')).toBeInTheDocument();
    expect(lockCard()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Novo mapa' }));
    expect(push).toHaveBeenCalledWith('/app/mapas/novo');
  });

  it('Free at the limit: only the lock card; header and CTA go to /planos with library_lock', () => {
    plan(2, 2);
    view(maps(2));
    expect(screen.queryByRole('link', { name: 'Criar um novo mapa' })).toBeNull();
    expect(screen.getByText('O Free permite até 2 mapas. Faça upgrade para criar o próximo.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Novo mapa' }));
    expect(push).toHaveBeenCalledWith('/app/planos?de=library_lock');
    expect(track).toHaveBeenCalledWith('upgrade_clicked', { source: 'library_lock' });
    track.mockClear();
    const cta = screen.getByRole('link', { name: 'Fazer upgrade' });
    expect(cta).toHaveAttribute('href', '/app/planos?de=library_lock');
    fireEvent.click(cta);
    expect(track).toHaveBeenCalledWith('upgrade_clicked', { source: 'library_lock' });
  });

  it('legacy Free (3 maps, limit 2): keeps everything, cannot create', () => {
    plan(2, 3);
    view(maps(3));
    expect(screen.getAllByRole('link', { name: /^Abrir Mapa/ })).toHaveLength(3);
    expect(screen.queryByRole('link', { name: 'Criar um novo mapa' })).toBeNull();
    expect(lockCard()).toBeInTheDocument();
  });

  it('Pro: new-map card with the default text, no lock', () => {
    plan(null, 5);
    view(maps(3));
    expect(screen.getByText('Comece do zero, de um PDF ou do seu Anki.')).toBeInTheDocument();
    expect(lockCard()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Novo mapa' }));
    expect(push).toHaveBeenCalledWith('/app/mapas/novo');
    expect(track).not.toHaveBeenCalled();
  });

  it('entitlements unavailable: as before, no extra cards', () => {
    view(maps(2));
    expect(screen.queryByRole('link', { name: 'Criar um novo mapa' })).toBeNull();
    expect(lockCard()).toBeNull();
  });

  it('extra cards only with Todos, empty search and grid view', () => {
    plan(2, 1);
    view(maps(1));
    fireEvent.change(screen.getByLabelText('Buscar mapa'), { target: { value: 'mapa' } });
    expect(lockCard()).toBeNull();
    fireEvent.change(screen.getByLabelText('Buscar mapa'), { target: { value: '' } });
    expect(lockCard()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver em lista' }));
    expect(lockCard()).toBeNull();
  });
});
