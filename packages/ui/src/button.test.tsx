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
  it('coloca ícone no começo e no fim, fora do nome acessível', () => {
    render(<Button icon={<svg data-testid="start" />} iconEnd={<svg data-testid="end" />}>Ir</Button>);
    const button = screen.getByRole('button', { name: 'Ir' });
    const start = button.querySelector('[data-testid="start"]');
    const end = button.querySelector('[data-testid="end"]');
    expect(start).toBeTruthy();
    expect(end).toBeTruthy();
    expect(Boolean(start && end && start.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });
  it('loading mostra o spinner e anima o rótulo', async () => {
    const { container } = render(<Button loading loadingLabel="Salvando">Salvar</Button>);
    const button = screen.getByRole('button', { name: 'Salvando' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('.remoa-spin')).toBeTruthy();
    expect(await violations(container)).toEqual([]);
  });
});
