import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompactMapHeader, FloatingMapBar, IconPill, MapGlyph, type CompactMapHeaderProps } from '.';
import { violations } from '../test-utils';

const header = (o: Partial<CompactMapHeaderProps> = {}) => (
  <CompactMapHeader title="Sepse" statusText="Salvo há 2 min" menuLabel="Abrir o menu" onMenu={() => {}} searchLabel="Buscar card" onSearchOpen={() => {}} closeSearchLabel="Fechar busca" onSearchClose={() => {}} {...o} />
);
const bar = (o = {}) => (
  <FloatingMapBar reviewLabel="Revisar" dueCount={2} onReview={() => {}} listLabel="Cards em lista" onToggleList={() => {}} createLabel="Criar card" onCreate={() => {}} {...o} />
);

describe('CompactMapHeader', () => {
  it('sem violações axe (estados e busca)', async () => {
    for (const status of ['saved', 'saving', 'offline', 'error'] as const) {
      const { container, unmount } = render(header({ status, onRetry: () => {}, retryLabel: 'Tentar de novo' }));
      expect(await violations(container)).toEqual([]);
      unmount();
    }
    const { container } = render(header({ searchOpen: true, query: '' }));
    expect(await violations(container)).toEqual([]);
  });
  it('mostra título e estado; o ponto segue o estado', () => {
    render(header({ status: 'offline', statusText: 'Sem conexão, salvando depois' }));
    expect(screen.getByText('Sepse')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('data-status', 'offline');
  });
  it('menu e busca disparam; busca aberta troca o título por campo, digita, Esc fecha', async () => {
    const onMenu = vi.fn(), onSearchOpen = vi.fn(), onSearchClose = vi.fn(), onQueryChange = vi.fn();
    const { rerender } = render(header({ onMenu, onSearchOpen }));
    await userEvent.click(screen.getByRole('button', { name: 'Abrir o menu' }));
    await userEvent.click(screen.getByRole('button', { name: 'Buscar card' }));
    expect(onMenu).toHaveBeenCalledOnce();
    expect(onSearchOpen).toHaveBeenCalledOnce();
    rerender(header({ searchOpen: true, onSearchClose, onQueryChange }));
    expect(screen.queryByText('Sepse')).toBeNull();
    const box = screen.getByRole('searchbox', { name: 'Buscar card' });
    expect(box).toHaveFocus();
    await userEvent.type(box, 'a');
    expect(onQueryChange).toHaveBeenCalledWith('a');
    await userEvent.keyboard('{Escape}');
    expect(onSearchClose).toHaveBeenCalledOnce();
  });
  it('erro oferece "Tentar de novo"', async () => {
    const onRetry = vi.fn();
    render(header({ status: 'error', statusText: 'Não salvou', retryLabel: 'Tentar de novo', onRetry }));
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe('IconPill', () => {
  const items = (fn = vi.fn(), disabled = false) => [
    { key: 'u', label: 'Desfazer', icon: <MapGlyph name="undo" />, onClick: fn, disabled },
    { key: 'r', label: 'Refazer', icon: <MapGlyph name="redo" />, onClick: () => {} },
  ];
  it('sem violações axe', async () => {
    const { container } = render(<IconPill aria-label="Zoom" caption="100%" items={items()} />);
    expect(await violations(container)).toEqual([]);
  });
  it('clica; desabilitado tem aria-disabled e não dispara', async () => {
    const fn = vi.fn();
    const { rerender } = render(<IconPill aria-label="Hist" items={items(fn)} />);
    await userEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(fn).toHaveBeenCalledOnce();
    rerender(<IconPill aria-label="Hist" items={items(fn, true)} />);
    const b = screen.getByRole('button', { name: 'Desfazer' });
    expect(b).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(b);
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('FloatingMapBar', () => {
  it('sem violações axe', async () => {
    const { container } = render(bar({ reviewAriaLabel: 'Revisar este mapa, 2 para hoje' }));
    expect(await violations(container)).toEqual([]);
  });
  it('tem um único botão de criar e dispara as três ações', async () => {
    const onReview = vi.fn(), onToggleList = vi.fn(), onCreate = vi.fn();
    render(bar({ onReview, onToggleList, onCreate }));
    expect(screen.getAllByRole('button', { name: 'Criar card' })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: /Revisar/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cards em lista' }));
    await userEvent.click(screen.getByRole('button', { name: 'Criar card' }));
    expect([onReview, onToggleList, onCreate].map((f) => f.mock.calls.length)).toEqual([1, 1, 1]);
  });
  it('estado: aria-pressed da lista, aria-expanded do criar e giro de 45°', () => {
    render(bar({ listActive: true, createOpen: true }));
    expect(screen.getByRole('button', { name: 'Cards em lista' })).toHaveAttribute('aria-pressed', 'true');
    const c = screen.getByRole('button', { name: 'Criar card' });
    expect(c).toHaveAttribute('aria-expanded', 'true');
    expect(c.firstElementChild).toHaveStyle({ transform: 'rotate(45deg)' });
  });
  it('sem vencidos não há selo; hidden some a barra', () => {
    const { rerender } = render(bar({ dueCount: 0 }));
    expect(screen.getByRole('button', { name: /Revisar/ }).textContent).toBe('Revisar');
    rerender(bar({ hidden: true }));
    expect(screen.queryByRole('button')).toBeNull();
  });
});
