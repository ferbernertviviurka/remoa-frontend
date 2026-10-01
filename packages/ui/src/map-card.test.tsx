import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapCard, mapCardDragHandle } from './map-card';
import { violations } from './test-utils';

const base = { label: 'Conceito: Sepse', typeLabel: 'Conceito', title: 'Sepse', openLabel: 'Abrir', openAriaLabel: 'Abrir Sepse' };

describe('MapCard', () => {
  it('é um article anunciado com tipo e título', () => {
    render(<MapCard {...base} />);
    expect(screen.getByRole('article', { name: 'Conceito: Sepse' })).toHaveTextContent('Sepse');
  });
  it('"Abrir" é um botão real, separado da alça de arraste', async () => {
    const onOpen = vi.fn();
    const { container } = render(<MapCard {...base} onOpen={onOpen} />);
    const button = screen.getByRole('button', { name: 'Abrir Sepse' });
    const handle = container.querySelector(`.${mapCardDragHandle}`);
    expect(handle).not.toBeNull();
    expect(handle!.contains(button)).toBe(false);
    await userEvent.click(handle!);
    expect(onOpen).not.toHaveBeenCalled();
    await userEvent.click(button);
    expect(onOpen).toHaveBeenCalledOnce();
  });
  it('mostra o estado só quando vem', () => {
    const { rerender } = render(<MapCard {...base} />);
    expect(screen.queryByText('Revisitar')).not.toBeInTheDocument();
    rerender(<MapCard {...base} state="review" stateLabel="Revisitar" />);
    expect(screen.getByText('Revisitar')).toBeInTheDocument();
    expect(screen.getByRole('article')).toHaveClass('border-review');
  });
  it('sem violações axe', async () => {
    const { container } = render(<MapCard {...base} state="steady" stateLabel="Mais estável" />);
    expect(await violations(container)).toEqual([]);
  });
});
