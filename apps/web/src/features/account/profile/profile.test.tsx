import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { profileCapabilities } from '@remoa/contracts';
import { accountFreeFixture, accountProFixture } from '@remoa/contracts/mocks';
import { resetStudyProfileCache } from '@/features/study-profile/use-study-profile';
import { Wrap } from '../test-utils';
import { AccountHero } from '../shell/account-hero';
import { ProfileSection } from './profile-section';

const api = vi.fn();
const track = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
const save = vi.fn();
const confirm = vi.fn();
let bank = false;
vi.mock('@/features/exam-builder/train-topic-link', () => ({ useBankStudentOpen: () => bank }));
vi.mock('@/features/study-profile/api', async () => {
  const f = await import('@/features/study-profile/fixtures');
  return {
    getStudyProfile: () => new Promise(() => {}), // /me already brings it; the shared read never answers here
    saveStudyProfile: (...a: unknown[]) => save(...a),
    confirmStudyProfile: (...a: unknown[]) => confirm(...a),
    suggestReference: async () => ({ ok: true, data: null }),
    listCourses: async () => ({ ok: true, data: f.COURSES }),
    listGoals: async (course?: string) => ({ ok: true, data: f.goalsFor(course) }),
    searchInstitutions: async () => ({ ok: true, data: [] }),
  };
});
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
  resetStudyProfileCache();
  bank = false;
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
    expect(screen.getByText('Perfil 17% completo')).toBeVisible(); // pending e-mail drops completeness
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

describe('Seu estudo (F35 FR-23..FR-25)', () => {
  const pro = accountProFixture; // medicine + graduação, goal ENAMED, institution typed "USP"
  it('cartão de foco, atalhos por perfil e cadastro de estudo', async () => {
    bank = true;
    view(pro);
    const card = screen.getByRole('region', { name: 'Seu estudo' });
    expect(within(card).getByText('SEU FOCO')).toBeVisible();
    expect(await within(card).findByText('Estudante de Medicina · 9º período')).toBeVisible();
    expect(within(card).getByText('ENAMED', { selector: 'span.font-display' })).toBeVisible();
    const nav = within(card).getByRole('navigation', { name: 'Atalhos do seu estudo' });
    expect(within(nav).getByRole('link', { name: 'Abrir mapas do ENAMED' })).toHaveAttribute('href', '/app/cobertura');
    await waitFor(() => expect(within(nav).getByRole('link', { name: 'Criar prova de Medicina' })).toHaveAttribute('href', '/app/banco-de-questoes/prova'));
    expect(within(nav).getByRole('link', { name: 'Novo mapa' })).toHaveAttribute('href', '/app/mapas/novo');
    expect(within(card).getByText('100% completo')).toBeVisible();
    expect(within(card).getByText('Conselho').nextSibling?.textContent).toBe('CRM');
  });

  it('sem o Enamed nem o banco: só "Novo mapa"; sem perfil: 0% e "Defina o seu foco"', async () => {
    view();
    const card = screen.getByRole('region', { name: 'Seu estudo' });
    expect(within(card).getByText('Defina o seu foco')).toBeVisible();
    expect(within(card).getByText('0% completo')).toBeVisible();
    expect(within(card).queryByRole('link', { name: /Criar prova/ })).toBeNull();
    expect(within(card).getByRole('link', { name: 'Novo mapa' })).toBeVisible();
  });

  it('Editar abre os campos; Salvar faz PUT, publica e avisa', async () => {
    const saved = { profile: { ...pro.studyProfile!, course: 'nursing' as const, goals: ['enamed' as const] }, capabilities: profileCapabilities({ course: 'nursing', situation: 'graduacao', source: 'profile' }) };
    save.mockResolvedValue({ ok: true, data: saved });
    const heard = vi.fn();
    window.addEventListener('remoa:study-profile', heard);
    view(pro);
    const card = screen.getByRole('region', { name: 'Seu estudo' });
    fireEvent.click(within(card).getByRole('button', { name: 'Editar' }));
    await waitFor(() => expect((screen.getByRole('combobox', { name: 'Curso ou área' }) as HTMLInputElement).value).toBe('Medicina'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Curso ou área' }), { target: { value: 'enferm' } });
    await waitFor(() => expect(screen.getAllByRole('option').some((o) => o.textContent?.startsWith('Enfermagem'))).toBe(true));
    fireEvent.click(screen.getAllByRole('option').find((o) => o.textContent?.startsWith('Enfermagem'))!);
    fireEvent.click(within(card).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0]![0]).toMatchObject({ course: 'nursing', goals: ['enamed'], institutionText: 'USP', context: 'profile' }); // ENAMED was the user's: kept
    expect(confirm).not.toHaveBeenCalled();
    expect(await screen.findByText('Seu estudo foi atualizado.')).toBeVisible();
    expect(heard).toHaveBeenCalledTimes(1);
    expect(within(card).queryByRole('combobox', { name: 'Curso ou área' })).toBeNull();
    window.removeEventListener('remoa:study-profile', heard);
  });

  it('perfil migrado confirma (POST confirm) em vez de PUT', async () => {
    confirm.mockResolvedValue({ ok: true, data: { profile: { ...pro.studyProfile!, source: 'profile' }, capabilities: profileCapabilities(null) } });
    view({ ...pro, studyProfile: { ...pro.studyProfile!, source: 'migration' } });
    fireEvent.click(within(screen.getByRole('region', { name: 'Seu estudo' })).getByRole('button', { name: 'Editar' }));
    await waitFor(() => expect((screen.getByRole('combobox', { name: 'Curso ou área' }) as HTMLInputElement).value).toBe('Medicina'));
    fireEvent.click(within(screen.getByRole('region', { name: 'Seu estudo' })).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(save).not.toHaveBeenCalled();
  });

  it('campos obrigatórios: sem foco não salva', async () => {
    view({ ...pro, studyProfile: { ...pro.studyProfile!, goals: [] } });
    fireEvent.click(within(screen.getByRole('region', { name: 'Seu estudo' })).getByRole('button', { name: 'Editar' }));
    await waitFor(() => expect((screen.getByRole('combobox', { name: 'Curso ou área' }) as HTMLInputElement).value).toBe('Medicina'));
    fireEvent.click(within(screen.getByRole('region', { name: 'Seu estudo' })).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Escolha pelo menos um foco de estudo.')).toBeVisible();
    expect(save).not.toHaveBeenCalled();
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
