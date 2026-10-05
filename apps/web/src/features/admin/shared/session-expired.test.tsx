import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const refresh = vi.fn();
const reauthenticate = vi.fn();
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/usuarios', useRouter: () => ({ refresh }) }));
vi.mock('@/server/auth/actions', () => ({ reauthenticate: (p: string) => reauthenticate(p), signOut: vi.fn() }));
const { SessionExpired } = await import('./session-expired');

afterEach(cleanup);
describe('SessionExpired (D-588)', () => {
  it('confirms the password, then refreshes the page so every request repeats', async () => {
    reauthenticate.mockResolvedValue({ ok: true });
    render(<SessionExpired />);
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await screen.findByRole('button', { name: 'Confirmar' });
    expect(reauthenticate).toHaveBeenCalledWith('segredo');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it('wrong password: message, no refresh', async () => {
    refresh.mockClear();
    reauthenticate.mockResolvedValue({ ok: false, error: { code: 'unauthorized', message: 'x' } });
    render(<SessionExpired />);
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'errada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await screen.findByRole('button', { name: 'Confirmar' });
    expect(await screen.findByText('Senha incorreta. Tente de novo.')).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});
