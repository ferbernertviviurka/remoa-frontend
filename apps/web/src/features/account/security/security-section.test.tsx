import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { accountFreeFixture, accountMocks, resetAccountMocks, sessionsFixture } from '@remoa/contracts/mocks';
import { ToastProvider } from '@remoa/ui';
import { AccountProvider } from '../shell/account-context';
import { SecuritySection } from './security-section';

const api = vi.fn();
const track = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { linkIdentity: vi.fn() } }) }));

const current = sessionsFixture[0]!.id;
const body = (init?: RequestInit) => JSON.parse(String(init?.body ?? '{}'));
const route = async (path: string, init?: RequestInit) => {
  const m = init?.method ?? 'GET';
  if (path === '/v1/account/sessions' && m === 'GET') return accountMocks.listSessions('u', current);
  if (path === '/v1/account/sessions' && m === 'DELETE') return accountMocks.revokeOtherSessions('u', current);
  if (path.startsWith('/v1/account/sessions/')) return accountMocks.revokeSession('u', current, path.split('/').pop()!);
  if (path === '/v1/account/password') return accountMocks.changePassword('u', current, body(init));
  if (path === '/v1/account/identities/google') return accountMocks.unlinkIdentity('u', 'google');
  throw new Error(path);
};

const view = (identities = accountFreeFixture.identities) =>
  render(
    <ToastProvider closeLabel="Fechar" viewportLabel="Avisos">
      <AccountProvider initial={{ ...accountFreeFixture, identities }}>
        <SecuritySection />
      </AccountProvider>
    </ToastProvider>,
  );
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
const type = (label: RegExp | string, v: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: v } });

beforeEach(() => {
  resetAccountMocks();
  api.mockImplementation(route);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SecuritySection', () => {
  it('save is enabled only with current, a valid new password and a matching confirmation', async () => {
    view();
    open();
    const save = screen.getByRole('button', { name: 'Salvar nova senha' });
    expect(save).toBeDisabled();
    type(/^Senha atual/, 'oldpass1');
    type(/^Nova senha/, 'abc');
    type('Confirmar nova senha', 'abc');
    expect(save).toBeDisabled();
    type(/^Nova senha/, 'abcdef12');
    expect(save).toBeDisabled();
    expect(screen.getByText('As senhas ainda não coincidem.')).toBeVisible();
    type('Confirmar nova senha', 'abcdef12');
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(track).toHaveBeenCalledWith('password_changed', { strength: 'fair' }));
    expect(api).toHaveBeenCalledWith('/v1/account/password', expect.objectContaining({ method: 'POST' }));
  });

  it('the meter label follows the typed text', () => {
    view();
    open();
    expect(screen.getByText('Digite uma senha')).toBeVisible();
    type(/^Nova senha/, 'abc');
    expect(screen.getByText('Fraca')).toBeVisible();
    type(/^Nova senha/, 'abcdef12');
    expect(screen.getByText('Razoável')).toBeVisible();
    type(/^Nova senha/, 'Abcdef12345!');
    expect(screen.getByText('Forte')).toBeVisible();
  });

  it('wrong current password and 429 show their messages', async () => {
    view();
    open();
    type(/^Senha atual/, 'wrong');
    type(/^Nova senha/, 'abcdef12');
    type('Confirmar nova senha', 'abcdef12');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByText('A senha atual não confere.')).toBeVisible();
    api.mockResolvedValueOnce({ ok: false, error: { code: 'rate_limited', message: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByText('Muitas tentativas. Tente de novo mais tarde.')).toBeVisible();
  });

  it('the password form is collapsed until "Alterar senha" and collapses again on cancel', () => {
    view();
    expect(screen.queryByLabelText(/^Senha atual/)).toBeNull();
    open();
    expect(screen.getByLabelText(/^Senha atual/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByLabelText(/^Senha atual/)).toBeNull();
  });

  it('refuses to disconnect the last sign-in method with an explanation', async () => {
    view(accountFreeFixture.identities.length > 1 ? accountFreeFixture.identities : [{ provider: 'google', email: 'a@g.co', createdAt: new Date(), lastSignInAt: null }]);
    resetAccountMocks({ ...accountFreeFixture, identities: [{ provider: 'google', email: 'a@g.co', createdAt: new Date(), lastSignInAt: null }] });
    fireEvent.click(screen.getByRole('button', { name: 'Desconectar' }));
    expect(await screen.findByText(/último jeito de entrar/)).toBeVisible();
  });

  it('ends one session: the other device goes away, the current has no button', async () => {
    view();
    const list = await screen.findByRole('list', { name: 'Lista de dispositivos' });
    expect(within(list).getAllByRole('button')).toHaveLength(2);
    expect(within(list).getByText('Este dispositivo · agora')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar sessão em Safari no iOS' }));
    await waitFor(() => expect(track).toHaveBeenCalledWith('session_revoked', { count: 1 }));
    await waitFor(() => expect(screen.queryByText('Safari no iOS')).toBeNull());
  });

  it('ends all the others', async () => {
    view();
    await screen.findByRole('list', { name: 'Lista de dispositivos' });
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar os outros' }));
    await waitFor(() => expect(track).toHaveBeenCalledWith('session_revoked', { count: 2 }));
    await waitFor(() => expect(screen.queryByText('Firefox no Windows')).toBeNull());
  });

  it('a failing list offers retry', async () => {
    api.mockResolvedValueOnce({ ok: false, error: { code: 'internal', message: 'x' } });
    view();
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('list', { name: 'Lista de dispositivos' })).toBeVisible();
  });
});
