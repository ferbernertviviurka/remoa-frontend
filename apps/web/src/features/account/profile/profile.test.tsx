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
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); // Radix Select/Checkbox in jsdom
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
    // Focus returns after the edit closes (a tick after the heading updates); under load that lands later.
    await waitFor(() => expect(screen.getByRole('button', { name: /Editar nome/ })).toHaveFocus());
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
    const group = screen.getByRole('group', { name: /^Objetivo de prova: Enamed/ });
    expect(within(group).getByRole('button', { name: 'Enamed 2027.1' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(group).getByRole('button', { name: 'Enamed 2027.2' }));
    expect(within(group).getByRole('button', { name: 'Enamed 2027.2' })).toHaveAttribute('aria-pressed', 'true'); // optimistic
    await waitFor(() => expect(within(group).getByRole('button', { name: 'Enamed 2027.2' })).toHaveAttribute('aria-pressed', 'false')); // reverted
    expect(within(group).getByRole('button', { name: 'Enamed 2027.1' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('Não conseguimos concluir agora. Tente de novo.')).toBeVisible();
  });

  it('G14 13: several objectives across groups, sent as goals (up to 5)', async () => {
    api.mockResolvedValue({ ok: true, data: {} });
    view();
    const residency = screen.getByRole('group', { name: /^Objetivo de prova: Resid/ });
    fireEvent.click(within(residency).getByRole('button', { name: 'ENARE' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/account/profile', { method: 'PATCH', body: JSON.stringify({ goals: ['enamed_2027_1', 'residencia_enare'] }) }));
    expect(within(residency).getByRole('button', { name: 'ENARE' })).toHaveAttribute('aria-pressed', 'true');
    const enamed = screen.getByRole('group', { name: /^Objetivo de prova: Enamed/ });
    expect(within(enamed).getByRole('button', { name: 'Enamed 2027.1' })).toHaveAttribute('aria-pressed', 'true'); // both stay
    for (const n of ['Enamed 2027.2', 'Enamed 2028.1', 'Enamed 2028.2']) fireEvent.click(within(enamed).getByRole('button', { name: n }));
    expect(within(residency).getByRole('button', { name: 'USP' })).toBeDisabled(); // 5 of 5
    expect(screen.getByText(/Você já escolheu 5 objetivos/)).toBeVisible();
  });
});

describe('personal data (G14 15)', () => {
  const withPhone = () => view({ ...accountFreeFixture, profile: { ...accountFreeFixture.profile, userType: 'aluno', sex: null, phone: '+5511912345678', address: null } });
  it('shows the saved data and PATCHes edits; cleared address goes as null, the phone is replaced', async () => {
    api.mockResolvedValue({ ok: true, data: {} });
    withPhone();
    expect((screen.getByLabelText('Telefone') as HTMLInputElement).value).toBe('(11) 91234-5678');
    expect(screen.getByRole('radio', { name: 'Aluno' })).toBeChecked();
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '21987654321' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Professor' }));
    const card = screen.getByRole('region', { name: 'Dados pessoais' });
    fireEvent.click(within(card).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/account/profile', { method: 'PATCH', body: JSON.stringify({ userType: 'professor', phone: '+5521987654321', address: null }) }));
    expect(await screen.findByText('Dados salvos.')).toBeVisible();
  });

  it('G20: the phone cannot be cleared (inline error, no PATCH)', () => {
    withPhone();
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '' } });
    fireEvent.click(within(screen.getByRole('region', { name: 'Dados pessoais' })).getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o seu telefone');
    expect(screen.getByLabelText('Telefone')).toHaveAttribute('aria-invalid', 'true');
    expect(api).not.toHaveBeenCalled();
  });
});

describe('instituição de ensino (G20)', () => {
  it('picks one from the list and PATCHes { institution }; clearing sends null', async () => {
    api.mockResolvedValue({ ok: true, data: {} });
    view();
    fireEvent.change(screen.getByLabelText('Instituição de ensino'), { target: { value: 'usp' } });
    const opt = (await screen.findAllByRole('option'))[0]!;
    const name = opt.textContent ?? '';
    fireEvent.click(opt);
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    const sent = JSON.parse((api.mock.calls[0]![1] as RequestInit).body as string).institution as { schoolId: string | null; name: string };
    expect(sent.schoolId).toBeTruthy();
    expect(name).toContain(sent.name);
    fireEvent.click(await screen.findByRole('button', { name: 'Limpar instituição' }));
    await waitFor(() => expect(api).toHaveBeenLastCalledWith('/v1/account/profile', { method: 'PATCH', body: JSON.stringify({ institution: null }) }));
  });

  it('free text goes with schoolId null', async () => {
    api.mockResolvedValue({ ok: true, data: {} });
    view();
    fireEvent.change(screen.getByLabelText('Instituição de ensino'), { target: { value: 'Escola Exemplo' } });
    fireEvent.click(await screen.findByRole('option', { name: /Usar “Escola Exemplo”/ }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/account/profile', { method: 'PATCH', body: JSON.stringify({ institution: { schoolId: null, name: 'Escola Exemplo' } }) }));
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
    fireEvent.change(input, { target: { files: [file('image/png', 101 * 1024 * 1024)] } });
    expect(within(dialog).getByRole('alert')).toHaveTextContent('passa de 100 MB');
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
