import { render, screen } from '@testing-library/react';
import { Tag } from './tag';
import { Pill } from './pill';
import { Card } from './card';
import { Progress } from './progress';
import { Avatar } from './avatar';
import { Eyebrow } from './eyebrow';
import { Logo } from './logo';
import { violations } from './test-utils';

describe('componentes de exibição', () => {
  it('sem violações axe', async () => {
    const { container } = render(
      <Card>
        <Eyebrow>Hoje</Eyebrow> <Tag tone="review">Revisitar</Tag> <Pill tone="steady">Estável</Pill>
        <Progress aria-label="Progresso" value={40} />
        <Avatar name="Ana Lima" fallback="AL" />
        <Logo title="remoa" />
      </Card>,
    );
    expect(await violations(container)).toEqual([]);
  });
  it('Progress expõe o valor', () => {
    render(<Progress aria-label="Progresso" value={40} />);
    expect(screen.getByRole('progressbar', { name: 'Progresso' })).toHaveAttribute('aria-valuenow', '40');
  });
  it('Progress busy brilha só enquanto ocupado; sm é o trilho fino', () => {
    const { rerender } = render(<Progress aria-label="Geração" value={30} busy size="sm" />);
    const bar = screen.getByRole('progressbar', { name: 'Geração' });
    expect(bar.className).toContain('h-1.5');
    expect(bar.firstElementChild?.className).toContain('st-shine');
    rerender(<Progress aria-label="Geração" value={30} />);
    expect(bar.firstElementChild?.className).not.toContain('st-shine');
  });
  it('Avatar com foto mostra o anel de carregamento até a imagem carregar', () => {
    render(<Avatar name="Ana Lima" fallback="AL" src="/foto.webp" />);
    expect(screen.getByTestId('avatar-loading')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Ana Lima' }).getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByText('AL')).toBeNull();
  });

  it('Avatar mostra fallback com nome acessível', () => {
    render(<Avatar name="Ana Lima" fallback="AL" />);
    expect(screen.getByRole('img', { name: 'Ana Lima' })).toHaveTextContent('AL');
  });
  it('Logo decorativo sem title', () => {
    const { container } = render(<Logo />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
