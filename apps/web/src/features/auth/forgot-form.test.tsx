import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ForgotForm } from './forgot-form';

const request = vi.fn();
vi.mock('@/server/auth/actions', () => ({ requestPasswordReset: (...a: unknown[]) => request(...a) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function submit(email: string) {
  render(<ForgotForm />);
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
  return screen.findByText(/Se houver uma conta/);
}

describe('ForgotForm', () => {
  it('mostra a mesma mensagem quando a conta existe e quando não existe', async () => {
    request.mockResolvedValueOnce({ ok: true });
    const a = (await submit('existe@b.co')).textContent;
    cleanup();
    request.mockResolvedValueOnce({ ok: false, error: { code: 'not_found', message: 'x' } });
    const b = (await submit('nao@b.co')).textContent;
    expect(a).toBe(b);
  });

  it('não envia e-mail inválido', () => {
    render(<ForgotForm />);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(request).not.toHaveBeenCalled();
  });
});
