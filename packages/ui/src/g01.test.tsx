import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Logo } from './logo';
import { StatePill, StateDot } from './state-pill';
import { StateBar } from './state-bar';
import { GraphPreview, previewSizes } from './graph-preview';
import { Menu } from './menu';


describe('G01 primitives', () => {
  it('Logo: wordmark vira img "remoa"; sem wordmark e sem title é decorativo; onDark troca a paleta', () => {
    const { container, rerender } = render(<Logo withWordmark />);
    expect(screen.getByRole('img', { name: 'remoa' })).toBeInTheDocument();
    rerender(<Logo />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    rerender(<Logo title="remoa" />);
    expect(screen.getByRole('img', { name: 'remoa' })).toBeInTheDocument();
    expect(container.querySelector('rect')).toHaveAttribute('fill', '#6D5BD0');
    rerender(<Logo title="remoa" onDark />);
    expect(container.querySelector('rect')).toHaveAttribute('fill', '#C9BFFF');
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
  it('previewSizes: mapa pequeno mantém 24x15; grande vira constelação com hubs maiores', () => {
    expect(previewSizes(6, [[0, 1]])).toEqual({ sizes: Array(6).fill({ w: 24, h: 15 }), constellation: false });
    const hub = [[0, 1], [0, 2], [0, 3], [0, 4]] as const;
    const big = previewSizes(60, hub);
    expect(big.constellation).toBe(true);
    expect(big.sizes[1]!.w).toBeLessThan(12);
    expect(big.sizes[1]!.w).toBeGreaterThanOrEqual(5);
    expect(big.sizes[0]!.w).toBeGreaterThan(big.sizes[1]!.w);
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
    const trigger = screen.getByRole('button', { name: 'Mais ações' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu'); // gatilho leve até o 1º uso (P-512)
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('menuitem', { name: 'Renomear' })).toHaveFocus(); // aberto pelo teclado: foco no 1º item, como no Radix
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Mais ações' })).toHaveFocus(); // fechou e o foco voltou ao gatilho
  });
  it('Menu: abre com o ponteiro; Esc fecha e reabre (Radix já montado)', async () => {
    render(<Menu trigger="icon" label="Mais ações" icon={<span>⋯</span>} items={[{ label: 'Renomear' }, { label: 'Excluir', tone: 'danger' }]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Mais ações' }));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mais ações', hidden: true })).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Mais ações' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
