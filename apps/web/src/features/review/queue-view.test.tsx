import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { reviewQueueFixture } from '@remoa/contracts/mocks';
import { QueueView } from './queue-view';
import { ChallengeProvider } from '@/features/challenge/provider';
import { Rail } from '@/features/shell/rail';

const track = vi.fn();
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
const push = vi.fn();
const api = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
const render = (ui: ReactElement) => rtlRender(<ChallengeProvider>{ui}</ChallengeProvider>);
vi.mock('next/navigation', () => ({ usePathname: () => '/app/revisar', useRouter: () => ({ push }), useSearchParams: () => new URLSearchParams() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const boardId = reviewQueueFixture[0]!.boardId;

describe('QueueView', () => {
  it('shows headline, stats, grouping and tracks queue_opened once', () => {
    render(<QueueView items={reviewQueueFixture} boardTitles={{ [boardId]: 'Sepse' }} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('4 conceitos vencem hoje, 4 em Sepse');
    expect(screen.getByRole('link', { name: 'Sepse' })).toHaveAttribute('href', `/app/mapas/${boardId}`);
    expect(screen.getByRole('list', { name: 'Fila por mapa' })).toHaveTextContent('4 Vencem hoje · 2 Novos · 1 Para acompanhar');
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('queue_opened', { due: 4, new: 2, weak: 1 });
  });

  it('starts the daily session and opens the map of its first item in challenge mode', async () => {
    api.mockResolvedValue({ ok: true, data: { sessionId: 's1', items: [{ id: 'c9', cardId: 'c9', boardId: 'b9', cardTitle: '', subId: null, mode: 'hidden_card', prompt: 'p', context: { neighbors: [] }, grading: 'none' }] } });
    render(<QueueView items={reviewQueueFixture} boardTitles={{}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Começar revisão' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/mapas/b9?modo=desafio&sessao=diaria'));
    expect(api.mock.calls[0]![0]).toBe('/v1/challenge/start');
    expect(JSON.parse(api.mock.calls[0]![1].body)).toMatchObject({ kind: 'daily' });
  });

  it('says so when the session cannot start', async () => {
    api.mockResolvedValue({ ok: false, error: { code: 'internal', message: 'x' } });
    render(<QueueView items={reviewQueueFixture} boardTitles={{}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Começar revisão' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não conseguimos montar a sessão.');
    expect(push).not.toHaveBeenCalled();
  });

  it('shows the empty state with a link to the boards', () => {
    render(<QueueView items={[]} boardTitles={{}} />);
    expect(screen.getByText('Nada para revisar hoje')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ir para Meus mapas' })).toHaveAttribute('href', '/app/mapas');
    expect(track).toHaveBeenCalledWith('queue_opened', { due: 0, new: 0, weak: 0 });
  });
});

describe('Rail badge', () => {
  it('labels the total due count on Revisar, hides zero', () => {
    const { unmount } = render(<Rail dueTotal={3} />);
    expect(screen.getByRole('link', { name: /Revisar/ })).toHaveAccessibleName(/3/);
    unmount();
    render(<Rail dueTotal={0} />);
    expect(screen.getByRole('link', { name: 'Revisar' })).toHaveAccessibleName('Revisar');
  });
});
