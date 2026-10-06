import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ChallengeTourHost, maybeShowChallengeTour, openChallengeTour, TOUR_KEY } from './tour';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('challenge tour (G14 ponto 19)', () => {
  it('shows once: "Entendi" marks it seen; "Ver de novo" (openChallengeTour) still opens it', async () => {
    render(<ChallengeTourHost />);
    act(() => maybeShowChallengeTour());
    expect(await screen.findByRole('dialog', { name: 'Como funciona o desafio' }, { timeout: 5000 })).toBeInTheDocument(); // lazy dialog (P-507): first import is cold
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem(TOUR_KEY)).toBe('1');
    act(() => maybeShowChallengeTour());
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => openChallengeTour());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  it('closing with Esc also counts as seen', async () => {
    render(<ChallengeTourHost />);
    act(() => maybeShowChallengeTour());
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    expect(localStorage.getItem(TOUR_KEY)).toBe('1');
  });
});
