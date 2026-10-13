import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ActivationItem } from '@remoa/contracts';
import { ActivationChecklist } from './activation-checklist';

afterEach(() => {
  cleanup();
  localStorage.clear();
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
  it('counts as installed when the app was seen installed before (normal tab)', () => {
    standalone(false);
    localStorage.setItem('remoa-pwa-installed', '1');
    const { container } = render(<ActivationChecklist items={items(20, 5, 1)} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('appinstalled completes the install item', () => {
    standalone(false);
    render(<ActivationChecklist items={items(20, 5, 0)} />);
    expect(screen.getByText('2 de 4 concluídos')).toBeInTheDocument();
    act(() => { window.dispatchEvent(new Event('appinstalled')); });
    expect(screen.getByText('3 de 4 concluídos')).toBeInTheDocument();
  });
  it('close button hides the box and stays hidden next visit', () => {
    standalone(false);
    const { container, unmount } = render(<ActivationChecklist items={items(8, 5, 0)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar o Comece por aqui' }));
    expect(container).toBeEmptyDOMElement();
    unmount();
    const again = render(<ActivationChecklist items={items(8, 5, 0)} />);
    expect(again.container).toBeEmptyDOMElement();
  });
});
