import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Logo } from './logo';
import { StatePill, StateDot } from './state-pill';
import { StateBar } from './state-bar';
import { GraphPreview } from './graph-preview';
import { Menu } from './menu';


describe('G01 primitives', () => {
  it('Logo: wordmark minúsculo; símbolo decorativo; sem wordmark vira img', () => {
    const { container, rerender } = render(<Logo withWordmark title="remoa" />);
    expect(screen.getByText('remoa')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    rerender(<Logo title="remoa" />);
    expect(screen.getByRole('img', { name: 'remoa' })).toBeInTheDocument();
  });
  it('StateDot rotulado vs decorativo; StatePill mostra o texto', () => {
    render(<><StateDot state="review" label="Revisitar" /><StatePill state="steady" label="Mais estável" /></>);
    expect(screen.getByRole('img', { name: 'Revisitar' })).toBeInTheDocument();
    expect(screen.getByText('Mais estável')).toBeInTheDocument();
  });
  it('StateBar: segmentos na ordem, zero vira um cinza', () => {
    const { container, rerender } = render(<StateBar aria-label="x" counts={{ review: 1, watch: 0, steady: 3, unknown: 2 }} />);
    expect([...container.querySelectorAll('[data-state]')].map((e) => e.getAttribute('data-state'))).toEqual(['review', 'steady', 'unknown']);
    rerender(<StateBar aria-label="x" counts={{ review: 0, watch: 0, steady: 0, unknown: 0 }} />);
    expect([...container.querySelectorAll('[data-state]')].map((e) => e.getAttribute('data-state'))).toEqual(['unknown']);
    expect(screen.getByRole('img', { name: 'x' })).toBeInTheDocument();
  });
  it('GraphPreview: nós, arestas, vazio, decorativo', () => {
    const { container, rerender } = render(<GraphPreview preview={{ nodes: [{ x: 0, y: 0, state: 'review' }, { x: 1, y: 1, state: 'steady' }], edges: [[0, 1], [0, 9]] }} />);
    expect(container.querySelectorAll('rect')).toHaveLength(2);
    expect(container.querySelectorAll('line')).toHaveLength(1);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    rerender(<GraphPreview preview={{ nodes: [], edges: [] }} label="Prévia vazia" />);
    expect(screen.getByTestId('graph-empty')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Prévia vazia' })).toBeInTheDocument();
  });
  it('Menu ícone: nome acessível, abre com teclado e seleciona', async () => {
    const onSelect = vi.fn();
    render(<Menu trigger="icon" label="Mais ações" icon={<span>⋯</span>} items={[{ label: 'Renomear', onSelect }]} />);
    screen.getByRole('button', { name: 'Mais ações' }).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
