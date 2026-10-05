import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { BoardSummary, HomeSummary } from '@remoa/contracts';
import { HomeView } from './home-view';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const now = new Date('2026-10-01T18:00:00Z'); // 15h em São Paulo
const week = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'].map((date, i) => ({ date, done: i < 3 ? 5 : 0, planned: i > 3 ? 4 : 0 }));
const summary = (dueToday: number, reviewedToday = 3): HomeSummary => ({
  reviewedToday,
  dueToday,
  week,
  streakDays: 4,
  upcoming: [dueToday, 14, 6, 9].map((count, i) => ({ date: `2026-10-0${1 + i}`, count })),
});
const board = (id: string, title: string, dueCount: number): BoardSummary =>
  ({
    id, title, area: 'CM', status: 'private', updatedAt: new Date(`2026-09-${10 + dueCount}T10:00:00Z`), cardCount: 6, edgeCount: 6, matrixItemId: null, dueCount,
    stateCounts: { review: dueCount, watch: 0, steady: 2, unknown: 1 },
    preview: { nodes: [{ x: 0.1, y: 0.2, state: 'review' }, { x: 0.6, y: 0.5, state: 'steady' }], edges: [[0, 1]] },
  }) as unknown as BoardSummary;

describe('HomeView', () => {
  it('"Indique um amigo" links to /app/indicar?de=home', () => {
    render(<HomeView now={now} summary={summary(0, 0)} boards={[board('1', 'Sepse', 0)]} coverage={[]} />);
    expect(screen.getByRole('link', { name: /Indique um amigo/ })).toHaveAttribute('href', '/app/indicar?de=home');
  });


  it('with due cards: greeting, hero, ring, only-board shortcut and week', () => {
    render(<HomeView now={now} summary={summary(12)} boards={[board('1', 'Sepse', 7), board('2', 'Asma', 5)]} coverage={[]} first={{ title: 'Choque séptico', pct: 58 }} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Boa tarde. 12 conceitos esperam por você.');
    expect(screen.getByRole('heading', { name: '2 mapas, 12 conceitos para fixar hoje.' })).toBeInTheDocument();
    expect(screen.getByText(/A fila começa por Choque séptico, que vence hoje com lembrança estimada de 58%/)).toBeInTheDocument();
    expect(screen.getByText('3 de 15')).toBeInTheDocument();
    expect(screen.getByText('4 dias seguidos')).toBeInTheDocument();
    expect(screen.getByText('Amanhã')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Só Sepse' }));
    expect(push).toHaveBeenCalledWith('/app/mapas/1?modo=desafio');
    fireEvent.click(screen.getByRole('button', { name: /Começar revisão/ }));
    expect(push).toHaveBeenCalledWith('/app/revisar');
    expect(screen.getByRole('link', { name: 'Abrir o mapa Sepse' })).toHaveAttribute('href', '/app/mapas/1');
  });

  it('nothing due: honest empty hero, no invented numbers', () => {
    render(<HomeView now={now} summary={summary(0, 0)} boards={[board('1', 'Sepse', 0)]} coverage={[]} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Boa tarde. Nada vence hoje.');
    expect(screen.getByRole('heading', { name: 'Nada para revisar hoje.' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Começar revisão/ })).toBeNull();
    expect(screen.queryByText(/revisados hoje/)).toBeNull();
    expect(screen.getByText(/Ligue um mapa a um item da matriz/)).toBeInTheDocument();
  });

  it('no maps: invites the first map', () => {
    render(<HomeView now={now} summary={summary(0, 0)} boards={[]} coverage={[]} />);
    expect(screen.getByRole('heading', { name: 'Crie o seu primeiro mapa.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar um novo mapa' })).toHaveAttribute('href', '/app/mapas/novo');
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo mapa' })[1]!);
    expect(push).toHaveBeenCalledWith('/app/mapas/novo');
  });
});
