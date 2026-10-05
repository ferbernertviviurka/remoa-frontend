import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Board } from '@remoa/contracts';
import { ToastProvider } from '@remoa/ui';
import { CanvasHeader } from './canvas-header';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock('@/lib/api', () => ({ api: vi.fn() }));

const board = { id: 'b', title: 'Mapa', area: 'clinica_medica', status: 'seed', archivedAt: null, updatedAt: new Date().toISOString() } as unknown as Board;
const onMode = vi.fn();
const view = (missing = 0) =>
  render(
    <ToastProvider closeLabel="Fechar" viewportLabel="Avisos">
      <CanvasHeader board={board} status={{ state: 'idle', savedAt: null } as never} onRetry={vi.fn()} mode="explore" onMode={onMode} missing={missing} coverage={{ pct: 42, item: 'ENARE' }} due={0} />
    </ToastProvider>,
  );
afterEach(() => cleanup());

describe('CanvasHeader coverage (P-050b)', () => {
  it('is reachable without lg: compact chip link and an overflow menu item', async () => {
    view();
    expect(screen.getAllByRole('link', { name: /cobre 42%/ }).every((a) => a.getAttribute('href') === '/app/cobertura')).toBe(true);
    expect(screen.getByText('cobre 42%').className).toContain('md:inline-flex');
    fireEvent.keyDown(screen.getAllByRole('button', { name: 'Mais ações do mapa' }).at(-1)!, { key: 'Enter' }); // phone menu
    fireEvent.click(await screen.findByRole('menuitem', { name: /Cobertura: 42%/ }));
    expect(push).toHaveBeenCalledWith('/app/cobertura');
  });
});

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

describe('CanvasHeader minimum cards (G14 ponto 18, D-603)', () => {
  it('below 10 cards "Desafiar este mapa" stays focusable, does nothing and explains on tap/focus', async () => {
    view(3);
    const b = screen.getByRole('button', { name: 'Desafiar este mapa' });
    expect(b).toHaveAttribute('aria-disabled', 'true');
    expect(b).toHaveAccessibleDescription(/Faltam 3/);
    fireEvent.click(b);
    expect(onMode).not.toHaveBeenCalled();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(/pelo menos 10 cards/);
    expect(screen.getByRole('radio', { name: 'Desafio' })).toBeDisabled();
  });
  it('with enough cards it enters the challenge (the map opens the options dialog)', () => {
    view(0);
    fireEvent.click(screen.getByRole('button', { name: 'Desafiar este mapa' }));
    expect(onMode).toHaveBeenCalledWith('challenge');
  });
});
