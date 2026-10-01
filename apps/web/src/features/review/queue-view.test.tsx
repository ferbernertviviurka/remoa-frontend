import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { reviewQueueFixture } from '@remoa/contracts/mocks';
import { QueueView } from './queue-view';
import { Sidebar } from '@/features/shell/sidebar';

const track = vi.fn();
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/revisar' }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const boardId = reviewQueueFixture[0]!.boardId;

describe('QueueView', () => {
  it('shows headline, stats, grouping and tracks queue_opened once', () => {
    render(<QueueView items={reviewQueueFixture} boardTitles={{ [boardId]: 'Sepse' }} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('4 conceitos vencem hoje, 4 em Sepse');
    expect(screen.getByRole('link', { name: 'Sepse' })).toHaveAttribute('href', `/mapas/${boardId}`);
    expect(screen.getByRole('list', { name: 'Fila por mapa' })).toHaveTextContent('4 Vencem hoje · 2 Novos · 1 Para acompanhar');
    expect(screen.getByRole('button', { name: 'Começar revisão' })).toBeDisabled();
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('queue_opened', { due: 4, new: 2, weak: 1 });
  });

  it('shows the empty state with a link to the boards', () => {
    render(<QueueView items={[]} boardTitles={{}} />);
    expect(screen.getByText('Nada para revisar hoje')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ir para Meus mapas' })).toHaveAttribute('href', '/mapas');
    expect(track).toHaveBeenCalledWith('queue_opened', { due: 0, new: 0, weak: 0 });
  });
});

describe('Sidebar badge', () => {
  const mk = (id: string, dueCount: number) => ({ id, title: `M${id}`, area: 'CM', status: 'private', updatedAt: new Date(), cardCount: 5, edgeCount: 0, dueCount }) as never;
  it('labels due counts per board and in total, hides zero', () => {
    render(<Sidebar boards={[mk('1', 3), mk('2', 0)]} />);
    expect(screen.getAllByText('3 vencem hoje')).toHaveLength(2); // board + "Revisar hoje" total
    expect(screen.queryByText('0 vencem hoje')).toBeNull();
  });
});
