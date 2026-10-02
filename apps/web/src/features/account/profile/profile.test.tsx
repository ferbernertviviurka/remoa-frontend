import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { accountFreeFixture } from '@remoa/contracts/mocks';
import { Wrap } from '../test-utils';
import { AccountHero } from '../shell/account-hero';
import { ProfileSection } from './profile-section';

const api = vi.fn();
const track = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
const putFile = vi.fn();
vi.mock('@/features/cards/upload', () => ({ putFile: (...a: unknown[]) => putFile(...a) }));
URL.createObjectURL = vi.fn(() => 'blob:x');
URL.revokeObjectURL = vi.fn();

const view = (initial = accountFreeFixture) =>
  render(
    <Wrap initial={initial}>
      <AccountHero />
      <ProfileSection />
    </Wrap>,
  );
const ok = <T,>(data: T) => ({ ok: true, data });
const boom = { ok: false, error: { code: 'internal', message: 'x' } };
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('name', () => {
  it('save is disabled when equal or invalid; saving updates the hero h1 and returns focus to Editar', async () => {
    api.mockResolvedValue(ok({}));
    view();
    fireEvent.click(screen.getByRole('button', { name: /Editar nome/ }));
    const save = screen.getByRole('button', { name: 'Salvar nome' });
    expect(save).toBeDisabled(); // same as current
    const input = screen.getByRole('textbox', { name: 'Nome' });
    fireEvent.change(input, { target: { value: 'A' } });
    expect(save).toBeDisabled(); // invalid
    fireEvent.change(input, { target: { value: '  Ana   Maria  ' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Ana Maria' })).toBeVisible());
    expect(api).toHaveBeenCalledWith('/v1/account/profile', { method: 'PATCH', body: JSON.stringify({ name: 'Ana Maria' }) });
    expect(track).toHaveBeenCalledWith('profile_name_changed', {});
    expect(screen.getByRole('button', { name: /Editar nome/ })).toHaveFocus();
  });

  it('a server error keeps the field open', async () => {
    api.mockResolvedValue(boom);
    view();
    fireEvent.click(screen.getByRole('button', { name: /Editar nome/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), { target: { value: 'Bia Lima' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(await screen.findByText('Não conseguimos concluir agora. Tente de novo.')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Nome' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 1, name: 'Ana Souza' })).toBeVisible();
  });
});

describe('email', () => {
  it('asks for the new e-mail and the current password, then shows the pending state', async () => {
    api.mockResolvedValue(ok({ pendingEmail: 'novo@remoa.test' }));
    view();
    fireEvent.click(screen.getByRole('button', { name: /Trocar e-mail/ }));
    const send = screen.getByRole('button', { name: 'Enviar confirmação' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Novo e-mail' }), { target: { value: 'novo@remoa.test' } });
    expect(send).toBeDisabled(); // no password yet
    fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: 'segredo123' } });
    fireEvent.click(send);
    expect(await screen.findByText('Aguardando confirmação de novo@remoa.test')).toBeVisible();
    expect(api).toHaveBeenCalledWith('/v1/account/email', { method: 'POST', body: JSON.stringify({ newEmail: 'novo@remoa.test', currentPassword: 'segredo123' }) });
    expect(screen.getByRole('button', { name: 'Reenviar' })).toBeDisabled(); // 60 s cooldown starts at send
    expect(screen.getByText('Perfil 40% completo')).toBeVisible(); // pending e-mail drops completeness
  });

  it('pending: resend starts the 60 s wait; cancel clears it', async () => {
    api.mockResolvedValue(ok(null));
    view({ ...accountFreeFixture, pendingEmail: 'novo@remoa.test' });
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reenviar' })).toBeDisabled());
    expect(screen.getByText('Você pode reenviar em 60 s.', { selector: 'span' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar troca' }));
    await waitFor(() => expect(screen.queryByText(/Aguardando confirmação/)).toBeNull());
  });
});

describe('study choices', () => {
  it('saves on click and reverts when the server fails', async () => {
    api.mockResolvedValue(boom);
    view();
    const group = screen.getByRole('radiogroup', { name: 'Objetivo de prova' });
    expect(within(group).getByRole('radio', { name: 'Enamed 2027.1' })).toBeChecked();
    fireEvent.click(within(group).getByRole('radio', { name: 'Enamed 2027.2' }));
    expect(within(group).getByRole('radio', { name: 'Enamed 2027.2' })).toBeChecked(); // optimistic
    await waitFor(() => expect(within(group).getByRole('radio', { name: 'Enamed 2027.1' })).toBeChecked()); // reverted
    expect(await screen.findByText('Não conseguimos concluir agora. Tente de novo.')).toBeVisible();
  });
});

describe('photo dialog', () => {
  const open = () => {
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Alterar foto de perfil' }));
    return screen.getByRole('dialog', { name: 'Foto de perfil' });
  };
  const file = (type: string, size = 1000) => {
    const f = new File(['x'], 'a', { type });
    Object.defineProperty(f, 'size', { value: size });
    return f;
  };

  it('Salvar foto starts disabled; an invalid file shows the error and keeps the dialog open', () => {
    const dialog = open();
    expect(within(dialog).getByRole('button', { name: 'Salvar foto' })).toBeDisabled();
    const input = dialog.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [file('application/pdf')] } });
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Esse arquivo não é uma imagem JPG, PNG ou WebP.');
    fireEvent.change(input, { target: { files: [file('image/png', 6 * 1024 * 1024)] } });
    expect(within(dialog).getByRole('alert')).toHaveTextContent('passa de 5 MB');
    expect(within(dialog).getByRole('button', { name: 'Salvar foto' })).toBeDisabled();
  });

  it('Esc closes without saving', () => {
    open();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api).not.toHaveBeenCalled();
  });

  it('choosing an avatar color enables save and PATCHes avatarColor (source initials)', async () => {
    api.mockResolvedValue(ok({}));
    const dialog = open();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Grafite' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar foto' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/account/profile', { method: 'PATCH', body: JSON.stringify({ avatarColor: 3 }) }));
    await waitFor(() => expect(track).toHaveBeenCalledWith('avatar_changed', { source: 'initials', zoom: null }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a failing save reverts the optimistic color', async () => {
    api.mockResolvedValue(boom);
    const dialog = open();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Grafite' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar foto' }));
    expect(await screen.findByText('Não conseguimos enviar a foto. Tente de novo.')).toBeVisible();
    expect(track).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Alterar foto de perfil' }));
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar foto' })).toBeDisabled(); // color back to the original
  });
});
