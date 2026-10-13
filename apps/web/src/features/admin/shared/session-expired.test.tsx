import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const refresh = vi.fn();
const reauthenticate = vi.fn();
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/usuarios', useRouter: () => ({ refresh }) }));
vi.mock('@/server/auth/actions', () => ({ reauthenticate: (p: string) => reauthenticate(p), signOut: vi.fn() }));
const { SessionExpired, ReauthPrompt } = await import('./session-expired');
const { notifyReauth } = await import('@/lib/api');

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
  it('a reauth_required from the API opens the password dialog in place, and it closes once confirmed', async () => {
    refresh.mockClear();
    reauthenticate.mockResolvedValue({ ok: true });
    render(<ReauthPrompt />);
    expect(screen.queryByLabelText('Senha')).toBeNull();
    notifyReauth({ code: 'forbidden', message: 'reauth_required' });
    fireEvent.change(await screen.findByLabelText('Senha'), { target: { value: 'segredo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(screen.queryByLabelText('Senha')).toBeNull());
    expect(reauthenticate).toHaveBeenCalledWith('segredo');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it('other errors do not open it', () => {
    render(<ReauthPrompt />);
    notifyReauth({ code: 'forbidden', message: 'not_admin' });
    expect(screen.queryByLabelText('Senha')).toBeNull();
  });
});
