import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ActivationItem } from '@remoa/contracts';
import { ActivationChecklist } from './activation-checklist';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const standalone = (on: boolean) => vi.stubGlobal('matchMedia', () => ({ matches: on }));
const items = (cards: number, edges: number, sessions: number): ActivationItem[] => [
  { id: 'cards', current: cards, target: 20, done: cards >= 20 },
  { id: 'edges', current: edges, target: 5, done: edges >= 5 },
  { id: 'sessions', current: sessions, target: 1, done: sessions >= 1 },
];

describe('ActivationChecklist', () => {
  it('shows progress and the install item as pending', () => {
    standalone(false);
    render(<ActivationChecklist items={items(8, 5, 0)} />);
    expect(screen.getByText('1 de 4 concluídos')).toBeInTheDocument();
    expect(screen.getByText('8 de 20')).toBeInTheDocument();
    expect(screen.getByText('Instalar no celular')).toBeInTheDocument();
  });
  it('hides when everything is done, installing counts via display-mode standalone', () => {
    standalone(true);
    const { container } = render(<ActivationChecklist items={items(20, 5, 1)} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('stays while only the install item is missing', () => {
    standalone(false);
    render(<ActivationChecklist items={items(20, 5, 1)} />);
    expect(screen.getByText('3 de 4 concluídos')).toBeInTheDocument();
  });
});
