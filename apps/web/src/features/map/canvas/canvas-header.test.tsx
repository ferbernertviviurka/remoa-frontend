import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Board } from '@remoa/contracts';
import { ToastProvider } from '@remoa/ui';
import { CanvasHeader } from './canvas-header';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock('@/lib/api', () => ({ api: vi.fn() }));

const board = { id: 'b', title: 'Mapa', area: 'clinica_medica', status: 'seed', archivedAt: null, updatedAt: new Date().toISOString() } as unknown as Board;
const view = () =>
  render(
    <ToastProvider closeLabel="Fechar" viewportLabel="Avisos">
      <CanvasHeader board={board} status={{ state: 'idle', savedAt: null } as never} onRetry={vi.fn()} mode="explore" onMode={vi.fn()} onPalette={vi.fn()} coverage={{ pct: 42, item: 'ENARE' }} due={0} />
    </ToastProvider>,
  );
afterEach(() => cleanup());

describe('CanvasHeader coverage (P-050b)', () => {
  it('is reachable without lg: compact chip link and an overflow menu item', async () => {
    view();
    expect(screen.getAllByRole('link', { name: /cobre 42%/ }).every((a) => a.getAttribute('href') === '/app/cobertura')).toBe(true);
    expect(screen.getByText('cobre 42%').className).toContain('md:inline-flex');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Mais ações do mapa' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: /Cobertura: 42%/ }));
    expect(push).toHaveBeenCalledWith('/app/cobertura');
  });
});
