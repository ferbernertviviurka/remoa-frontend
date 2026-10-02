import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordInput } from './password-input';
import { violations } from './test-utils';

const defaults = {
  label: 'Senha',
  showAriaLabel: 'Mostrar senha',
  hideAriaLabel: 'Ocultar senha',
} as const;

describe('PasswordInput', () => {
  it('sem violações axe (estado oculto)', async () => {
    const { container } = render(<PasswordInput {...defaults} />);
    expect(await violations(container)).toEqual([]);
  });

  it('sem violações axe (estado visível)', async () => {
    const { container } = render(<PasswordInput {...defaults} />);
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(await violations(container)).toEqual([]);
  });

  it('campo começa como type=password', () => {
    render(<PasswordInput {...defaults} />);
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });

  it('botão mostrar/ocultar alterna o tipo', async () => {
    render(<PasswordInput {...defaults} />);
    const input = screen.getByLabelText('Senha');
    const btn = screen.getByRole('button', { name: 'Mostrar senha' });
    await userEvent.click(btn);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('exibe mensagem de erro e aria-invalid quando error fornecido', async () => {
    const { container } = render(<PasswordInput {...defaults} error="A senha é obrigatória." />);
    expect(screen.getByText('A senha é obrigatória.')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true');
    expect(await violations(container)).toEqual([]);
  });

  it('exibe hint quando não há erro', () => {
    render(<PasswordInput {...defaults} hint="De 6 a 64 caracteres." />);
    expect(screen.getByText('De 6 a 64 caracteres.')).toBeInTheDocument();
  });

  it('não exibe hint quando há erro', () => {
    render(<PasswordInput {...defaults} hint="De 6 a 64 caracteres." error="Erro" />);
    expect(screen.queryByText('De 6 a 64 caracteres.')).not.toBeInTheDocument();
  });

  it('aplica autocomplete passado por prop', () => {
    render(<PasswordInput {...defaults} autocomplete="new-password" />);
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'new-password');
  });

  it('respeita minLength e maxLength', () => {
    render(<PasswordInput {...defaults} minLength={6} maxLength={64} />);
    const input = screen.getByLabelText('Senha');
    expect(input).toHaveAttribute('minLength', '6');
    expect(input).toHaveAttribute('maxLength', '64');
  });

  it('botão toggle tem aria-pressed', async () => {
    render(<PasswordInput {...defaults} />);
    const btn = screen.getByRole('button', { name: 'Mostrar senha' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(btn);
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true');
  });
});
