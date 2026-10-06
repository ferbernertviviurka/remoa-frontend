import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommandPaletteProvider, PaletteButton, usePaletteCommands } from './command-palette';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
afterEach(() => cleanup());

const mapItems = [{ id: 'layer:structure', group: 'Camadas', label: 'Mostrar estrutura' }];
function MapLike({ run }: { run: (id: string) => void }) {
  usePaletteCommands(mapItems, (c) => run(c.id));
  return null;
}

describe('global command palette (G14 ponto 22, D-607)', () => {
  it('opens from the navbar button and ⌘K on any screen; global commands navigate', async () => {
    render(<CommandPaletteProvider><PaletteButton /></CommandPaletteProvider>);
    fireEvent.click(screen.getByRole('button', { name: /Buscar ou comandar/ }));
    fireEvent.change(await screen.findByRole('combobox', { name: 'Buscar comando' }) /* lazy dialog (P-507) */, { target: { value: 'meus mapas' } });
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/app/mapas');
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Mostrar estrutura/ })).toBeNull();
  });
  it('a mounted screen adds its commands; they go away when it unmounts', async () => {
    const run = vi.fn();
    const { rerender } = render(<CommandPaletteProvider><MapLike run={run} /></CommandPaletteProvider>);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    fireEvent.click(await screen.findByRole('option', { name: /Mostrar estrutura/ }));
    expect(run).toHaveBeenCalledWith('layer:structure');
    rerender(<CommandPaletteProvider>{null}</CommandPaletteProvider>);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.queryByRole('option', { name: /Mostrar estrutura/ })).toBeNull();
  });
});
