import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { reviewHubFixture } from '@remoa/contracts/mocks';
import { ReviewHubView } from './review-hub-view';
import { computeQueue, DEFAULT_CHIPS, sortAreas } from './hub-math';
import { ChallengeProvider } from '@/features/challenge/provider';

const track = vi.fn();
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
const push = vi.fn();
const refresh = vi.fn();
const api = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/app/revisar', useRouter: () => ({ push, refresh }), useSearchParams: () => new URLSearchParams() }));
const render = (ui: ReactElement) => rtlRender(<ChallengeProvider>{ui}</ChallengeProvider>);
const session = { ok: true, data: { sessionId: 's1', items: [{ id: 'c9', cardId: 'c9', boardId: 'b9', cardTitle: '', subId: null, mode: 'hidden_card', prompt: 'p', context: { neighbors: [] }, grading: 'none' }] } };

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// fixture (active): Sepse 2 due + 1 new, Insuficiência cardíaca 5 due + 4 new; weak 11; default queue 12
const chip = (name: RegExp) => within(screen.getByRole('group', { name: 'O que entra na fila' })).getByRole('button', { name });
const cta = (n: number) => screen.getByRole('button', { name: `Começar revisão · ${n}` });

describe('ReviewHubView', () => {
  it('shows the default queue (due + new, "em atenção" off) and tracks revisar_opened once', async () => {
    render(<ReviewHubView hub={reviewHubFixture('active')} plan="free" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/12 cards esperam por você\./);
    expect(cta(12)).toBeVisible();
    expect(chip(/Vencidos/)).toHaveAttribute('aria-pressed', 'true');
    expect(chip(/Em atenção/)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Até 10 cards novos por dia no Free.')).toBeVisible();
    expect(screen.getByText('Cerca de 5 minutos')).toBeVisible();
    expect(await screen.findByText('12', { selector: 'span.font-display' }, { timeout: 4000 })).toBeVisible(); // ring number after the count-up
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('revisar_opened', { due: 7, new: 5, weak: 11 });
  });

  it('chips recompute queue, bar, ring and time without a request', async () => {
    render(<ReviewHubView hub={reviewHubFixture('active')} plan="free" />);
    fireEvent.click(chip(/Em atenção/));
    expect(cta(23)).toBeVisible();
    fireEvent.click(chip(/Vencidos/));
    expect(cta(16)).toBeVisible();
    expect(screen.getByRole('img', { name: '0 vencidos, 5 novos e 11 em atenção na fila' })).toBeVisible();
    expect(screen.getByRole('img', { name: '3 de 19 revisados hoje' })).toBeVisible();
    expect(api).not.toHaveBeenCalled();
  });

  it('turning a map off recomputes the queue and the counts without a request', () => {
    render(<ReviewHubView hub={reviewHubFixture('active')} plan="free" />);
    const sw = screen.getByRole('switch', { name: /Sepse/ });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'false');
    expect(cta(9)).toBeVisible();
    expect(chip(/Vencidos/)).toHaveTextContent('5');
    expect(api).not.toHaveBeenCalled();
  });

  it('CTA starts the daily session already filtered and opens the map of its first item', async () => {
    api.mockResolvedValue(session);
    render(<ReviewHubView hub={reviewHubFixture('active')} plan="free" />);
    fireEvent.click(screen.getByRole('switch', { name: /Sepse/ }));
    fireEvent.click(cta(9));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/mapas/b9?modo=desafio&sessao=diaria'));
    expect(api.mock.calls[0]![0]).toBe('/v1/challenge/start');
    const body = JSON.parse(api.mock.calls[0]![1].body);
    expect(body).toMatchObject({ kind: 'daily', limit: 9, filter: { reasons: ['due', 'new'] } });
    expect(body.filter.boardIds).toHaveLength(1);
    expect(track).toHaveBeenCalledWith('revisar_session_started', { count: 9, reasons: ['due', 'new'], maps: 1, ahead: false, area: null });
  });

  it('says so when the session cannot start', async () => {
    api.mockResolvedValue({ ok: false, error: { code: 'internal', message: 'x' } });
    render(<ReviewHubView hub={reviewHubFixture('active')} plan="free" />);
    fireEvent.click(cta(12));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não conseguimos montar a sessão.');
    expect(push).not.toHaveBeenCalled();
  });

  it('unlimited new cards (newLimit null): says so instead of "Até N"', () => {
    const hub = reviewHubFixture('active');
    render(<ReviewHubView hub={{ ...hub, queue: { ...hub.queue, newLimit: null, newRemaining: null } }} plan="pro" />);
    expect(screen.getByText('Sem limite de cards novos por dia no seu plano.')).toBeVisible();
    expect(screen.getByText('Sem limite por dia')).toBeVisible();
  });

  it('done: "Adiantar revisões" starts with filter ahead', async () => {
    api.mockResolvedValue(session);
    render(<ReviewHubView hub={reviewHubFixture('done')} plan="pro" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Tudo em dia\./);
    expect(screen.getByRole('heading', { level: 2, name: 'Nada mais para revisar hoje.' })).toBeVisible();
    expect(screen.getByText('Amanhã você tem cerca de 12 cards. Quer adiantar alguns?')).toBeVisible();
    expect(screen.getByText('Até 10 cards novos por dia no Pro.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Adiantar revisões' }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(JSON.parse(api.mock.calls[0]![1].body)).toMatchObject({ kind: 'daily', limit: 26, filter: { ahead: true } });
  });

  it('empty: invites to create the first map, no charts', () => {
    render(<ReviewHubView hub={reviewHubFixture('empty')} plan="free" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Vamos começar\?/);
    expect(screen.getByRole('link', { name: 'Criar meu primeiro mapa' })).toHaveAttribute('href', '/app/mapas/novo');
    expect(screen.queryByRole('heading', { name: 'Próximos 14 dias' })).toBeNull();
  });

  it('no history: charts give way to the message', () => {
    render(<ReviewHubView hub={reviewHubFixture('no_history')} plan="free" />);
    expect(screen.getByRole('heading', { name: 'Seus gráficos aparecem depois da primeira revisão.' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Criar meu primeiro mapa' })).toBeNull();
  });

  it('charts: indicators, forecast, retention range switch, areas and hard cards', () => {
    render(<ReviewHubView hub={reviewHubFixture('active')} plan="free" />);
    expect(screen.getByText('Seu recorde é de 21 dias')).toBeVisible();
    expect(screen.getByRole('img', { name: '4 de 7 dias da semana com revisão' })).toBeVisible();
    expect(screen.getByText('Média de 17 por dia')).toBeVisible();
    expect(screen.getByRole('figure', { name: /Revisões previstas para os próximos 14 dias\. Pico em/ })).toBeVisible();
    expect(screen.getByRole('figure', { name: 'Estado dos cards: 7 vencidos, 11 em atenção, 21 firmes e 5 novos.' })).toBeVisible();
    const before = screen.getAllByRole('button', { name: /^\d+%, / }).length;
    expect(before).toBe(30);
    fireEvent.click(screen.getByRole('radio', { name: '7 dias' }));
    expect(screen.getAllByRole('button', { name: /^\d+%, / })).toHaveLength(7);
    // areas: with cards first, "Criar mapa" for the empty ones
    expect(screen.getByRole('button', { name: 'Revisar só Clínica Médica' })).toBeVisible();
    expect(screen.getAllByRole('link', { name: 'Criar mapa' })).toHaveLength(4);
    const hard = screen.getByRole('link', { name: 'Reescrever Critérios de sepse (qSOFA e SOFA)' });
    expect(hard.getAttribute('href')).toMatch(/^\/app\/mapas\/.+\?card=.+/);
    expect(within(screen.getByRole('table', { name: 'Por mapa' })).getAllByRole('row')).toHaveLength(3);
  });

  it('per-map "Revisar este mapa" starts a session for that map only', async () => {
    api.mockResolvedValue(session);
    const hub = reviewHubFixture('active');
    render(<ReviewHubView hub={hub} plan="free" />);
    fireEvent.click(screen.getByRole('button', { name: 'Revisar o mapa Sepse' }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(JSON.parse(api.mock.calls[0]![1].body).filter).toEqual({ boardIds: [hub.maps[0]!.boardId], reasons: ['due', 'new'] });
  });
});

describe('hub-math', () => {
  it('keeps only the first newRemaining new items, as the server does', () => {
    const hub = reviewHubFixture('active');
    const all = new Set(hub.maps.map((m) => m.boardId));
    expect(computeQueue({ ...hub, queue: { ...hub.queue, newRemaining: 3 } }, all, DEFAULT_CHIPS).counts.new).toBe(3);
    expect(computeQueue(hub, new Set(), DEFAULT_CHIPS).size).toBe(0);
    // null = unlimited (Pro/Founder): every new item stays
    const everyNew = hub.queue.items.filter((i) => i.reason === 'new').length;
    expect(computeQueue({ ...hub, queue: { ...hub.queue, newLimit: null, newRemaining: null } }, all, DEFAULT_CHIPS).counts.new).toBe(everyNew);
  });
  it('sorts areas weakest first, areas without cards last', () => {
    const rows = sortAreas([
      { area: 'CM', cards: 4, dueToday: 0, attempts: 9, accuracy: 0.9 },
      { area: 'GO', cards: 0, dueToday: 0, attempts: 0, accuracy: null },
      { area: 'CIR', cards: 4, dueToday: 0, attempts: 9, accuracy: 0.6 },
    ]);
    expect(rows.map((r) => r.area)).toEqual(['CIR', 'CM', 'GO']);
  });
});
