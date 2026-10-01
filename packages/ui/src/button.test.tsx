import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';
import { violations } from './test-utils';

describe('Button', () => {
  it('sem violações axe', async () => {
    const { container } = render(<Button icon={<svg />}>Salvar</Button>);
    expect(await violations(container)).toEqual([]);
  });
  it('dispara click e não é submit por padrão', async () => {
    const fn = vi.fn();
    render(<Button onClick={fn}>Ir</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Ir' }));
    expect(fn).toHaveBeenCalledOnce();
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
  it('size touch tem altura mínima 46px', () => {
    render(<Button size="touch">Ir</Button>);
    expect(screen.getByRole('button').className).toContain('min-h-[46px]');
  });
});
