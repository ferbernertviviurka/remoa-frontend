import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapCard, MapEdgeLabel, type MapCardProps } from '.';
import { violations } from '../test-utils';

const base: MapCardProps = { type: 'concept', typeLabel: 'Conceito', title: 'Sepse', state: 'review', stateLabel: 'Revisitar', recallLabel: '58%', summary: 'Disfunção orgânica.', selectLabel: 'Sepse, Conceito, Revisitar', };
const flow: MapCardProps = { ...base, type: 'flow', typeLabel: 'Fluxograma', summary: undefined, steps: ['Dosar lactato', 'Hemoculturas'], stepsMore: '+ 2 passos' };

describe('MapCard', () => {
  it('nível completo: tipo, título, resumo, lembrança e estado; botão com nome', () => {
    render(<MapCard {...base} />);
    expect(screen.getByRole('button', { name: 'Sepse, Conceito, Revisitar' })).toBeInTheDocument();
    for (const x of ['Conceito', 'Sepse', 'Disfunção orgânica.', '58%', 'Revisitar']) expect(screen.getByText(x)).toBeInTheDocument();
  });
  it('visão geral: sem resumo nem lembrança; título 19 px; mantém tipo e estado', () => {
    render(<MapCard {...base} level="overview" />);
    expect(screen.queryByText('Disfunção orgânica.')).toBeNull();
    expect(screen.queryByText('58%')).toBeNull();
    expect(screen.getByText('Sepse')).toHaveStyle({ fontSize: 'var(--map-text-overview)' });
    expect(screen.getByText('Conceito')).toBeInTheDocument();
    expect(screen.getByText('Revisitar')).toBeInTheDocument();
  });
  it('fluxograma mostra passos e "+ N"; imagem mostra miniatura ou placeholder', () => {
    const { rerender } = render(<MapCard {...flow} />);
    expect(screen.getByText('Hemoculturas')).toBeInTheDocument();
    expect(screen.getByText('+ 2 passos')).toBeInTheDocument();
    rerender(<MapCard {...flow} level="overview" />);
    expect(screen.queryByText('+ 2 passos')).toBeNull();
    rerender(<MapCard {...base} type="image" image={{ src: null, alt: 'Imagem de Rx' }} />);
    expect(screen.getByRole('img', { name: 'Imagem de Rx' })).toBeInTheDocument();
  });
  it('imagem da pergunta em card comum: aparece inteira e cresce com o card redimensionado', () => {
    const { container, rerender } = render(<MapCard {...base} image={{ src: '/rx.webp', alt: 'Imagem da pergunta' }} />);
    expect(screen.getByRole('img', { name: 'Imagem da pergunta' })).toHaveClass('object-contain');
    expect(container.querySelector('[data-card-image]')).toHaveClass('h-[54px]');
    rerender(<MapCard {...base} size={{ w: 152, h: 260 }} image={{ src: '/rx.webp', alt: 'Imagem da pergunta' }} />);
    expect(container.querySelector('[data-card-image]')).toHaveClass('flex-1');
    rerender(<MapCard {...base} level="overview" image={{ src: '/rx.webp', alt: 'Imagem da pergunta' }} />);
    expect(container.querySelector('[data-card-image]')).toBeNull();
  });
  it('selecionado, esmaecido (busca) e clique', async () => {
    const onSelect = vi.fn();
    render(<MapCard {...base} selected dimmed onSelect={onSelect} />);
    const b = screen.getByRole('button');
    expect(b).toHaveAttribute('aria-pressed', 'true');
    expect(b).toHaveAttribute('data-dimmed');
    expect(b.className).toContain('opacity-[.22]');
    await userEvent.click(b);
    expect(onSelect).toHaveBeenCalledOnce();
  });
  it.each(['review', 'watch', 'steady', 'unknown'] as const)('estado %s sem violações axe', async (state) => {
    const { container } = render(<MapCard {...base} state={state} />);
    expect(await violations(container)).toEqual([]);
  });
});

describe('MapEdgeLabel', () => {
  it('rótulo comum e "sem rótulo" em âmbar; botão só com onClick', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<MapEdgeLabel label="suspeita" />);
    expect(screen.getByText('suspeita').tagName).toBe('SPAN');
    rerender(<MapEdgeLabel label="sem rótulo" empty onClick={onClick} buttonLabel="Adicionar rótulo" />);
    const b = screen.getByRole('button', { name: 'Adicionar rótulo' });
    expect(b.className).toContain('--state-watch-bg');
    await userEvent.click(b);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
