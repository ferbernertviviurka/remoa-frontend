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
  it('Avatar mostra fallback com nome acessível', () => {
    render(<Avatar name="Ana Lima" fallback="AL" />);
    expect(screen.getByRole('img', { name: 'Ana Lima' })).toHaveTextContent('AL');
  });
  it('Logo decorativo sem title', () => {
    const { container } = render(<Logo />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
