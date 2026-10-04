import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SignInForm } from './sign-in-form';
import { SignUpWizard } from './sign-up-wizard';

const push = vi.fn();
const signUp = vi.fn();
const signIn = vi.fn();
const api = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock('@/server/auth/actions', () => ({
  signUp: (...a: unknown[]) => signUp(...a),
  signIn: (...a: unknown[]) => signIn(...a),
  sendMagicLink: vi.fn(),
  signInWithGoogle: vi.fn(),
}));
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn(), identify: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } }) }));

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); // Radix (radio/checkbox) in jsdom
  signUp.mockResolvedValue({ ok: true });
  signIn.mockResolvedValue({ ok: true });
  api.mockResolvedValue({ ok: true, data: {} });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('SignInForm', () => {
  it('valida por campo antes de enviar', () => {
    render(<SignInForm />);
    click('Entrar');
    expect(screen.getAllByRole('alert')[0]!.textContent).toMatch(/e-mail válido/);
    expect(signIn).not.toHaveBeenCalled();
  });

  it('entra e vai para o next seguro; next externo cai no Hoje', async () => {
    render(<SignInForm next="//evil.com" />);
    type('E-mail', 'a@b.co');
    type('Senha', 'senha-forte-123');
    click('Entrar');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/hoje'));
    expect(signIn).toHaveBeenCalledWith({ email: 'a@b.co', password: 'senha-forte-123' });
  });

  it('mostra erro geral com role=alert quando a senha está errada', async () => {
    signIn.mockResolvedValue({ ok: false, error: { code: 'unauthorized', message: 'x' } });
    render(<SignInForm />);
    type('E-mail', 'a@b.co');
    type('Senha', 'errada');
    click('Entrar');
    expect((await screen.findByRole('alert')).textContent).toBe('E-mail ou senha incorretos.');
  });

  it('preserva o next no link de cadastro', () => {
    render(<SignInForm next="/app/mapas" />);
    expect(screen.getByRole('link', { name: 'Criar conta' }).getAttribute('href')).toBe('/cadastro?next=%2Fapp%2Fmapas');
  });
});

describe('SignUpWizard', () => {
  const fillAccount = () => {
    type('E-mail', 'novo@remoa.test');
    type('Senha', 'senha-forte-123');
  };

  it('não avança com senha fraca', () => {
    render(<SignUpWizard />);
    type('E-mail', 'novo@remoa.test');
    type('Senha', 'abcdefgh'); // 8 sem número: o servidor aceita, a política do F13 não
    click('Continuar');
    expect(screen.getByRole('alert').textContent).toMatch(/letras e números/);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Criar conta');
  });

  it('avança, volta sem perder o digitado e marca o passo atual', () => {
    render(<SignUpWizard />);
    fillAccount();
    click('Continuar');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sobre você');
    expect(screen.getByRole('listitem', { current: 'step' }).textContent).toContain('Sobre você');
    type('Como podemos te chamar?', 'Ana Souza');
    click('Voltar');
    expect((screen.getByLabelText('E-mail') as HTMLInputElement).value).toBe('novo@remoa.test');
    click('Continuar');
    expect((screen.getByLabelText('Como podemos te chamar?') as HTMLInputElement).value).toBe('Ana Souza');
  });

  it('exige o consentimento, envia nome, e grava momento/objetivo pelo PATCH do perfil', async () => {
    render(<SignUpWizard next="/app/mapas" />);
    fillAccount();
    click('Continuar');
    type('Como podemos te chamar?', 'Ana Souza');
    fireEvent.click(screen.getByRole('radio', { name: '5º–6º ano' }));
    fireEvent.click(screen.getByRole('radio', { name: 'ENARE' }));
    click('Continuar');
    click('Criar conta');
    expect(screen.getByRole('alert').textContent).toMatch(/Marque a caixa/);
    expect(signUp).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox'));
    click('Criar conta');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/mapas'));
    expect(signUp).toHaveBeenCalledWith({ email: 'novo@remoa.test', password: 'senha-forte-123', name: 'Ana Souza' });
    expect(api).toHaveBeenCalledWith('/v1/account/profile', { method: 'PATCH', body: JSON.stringify({ stage: 'y5_6', goal: 'residencia_enare' }) });
  });

  it('e-mail já cadastrado volta ao passo 1 com o erro no campo', async () => {
    signUp.mockResolvedValue({ ok: false, error: { code: 'conflict', message: 'x' } });
    render(<SignUpWizard />);
    fillAccount();
    click('Continuar');
    click('Continuar');
    fireEvent.click(screen.getByRole('checkbox'));
    click('Criar conta');
    expect((await screen.findByRole('alert')).textContent).toMatch(/Já existe uma conta/);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Criar conta');
    expect((screen.getByLabelText('E-mail') as HTMLInputElement).value).toBe('novo@remoa.test');
  });
});
