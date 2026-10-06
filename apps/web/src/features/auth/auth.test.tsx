import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SignInForm } from './sign-in-form';
import { SignUpWizard } from './sign-up-wizard';

const push = vi.fn();
const signUp = vi.fn();
const signIn = vi.fn();
const api = vi.fn();
const resend = vi.fn();
let session = true;
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock('@/server/auth/actions', () => ({
  signUp: (...a: unknown[]) => signUp(...a),
  signIn: (...a: unknown[]) => signIn(...a),
  sendMagicLink: vi.fn(),
  signInWithGoogle: vi.fn(),
  resendConfirmation: (...a: unknown[]) => resend(...a),
}));
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: session ? { id: 'u1' } : null } }) } }) }));

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); // Radix (radio/checkbox) in jsdom
  session = true;
  resend.mockResolvedValue({ ok: true });
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

  // the personal-data form downloads after the first paint (P-514): wait for it
  const toAbout = async () => { fillAccount(); click('Continuar'); await screen.findByLabelText('Telefone'); };
  const fillAbout = () => { type('Como podemos te chamar?', 'Ana Souza'); type('Telefone', '11912345678'); };

  it('avança, volta sem perder o digitado e marca o passo atual', async () => {
    render(<SignUpWizard />);
    await toAbout();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sobre você');
    expect(screen.getByRole('listitem', { current: 'step' }).textContent).toContain('Sobre você');
    type('Como podemos te chamar?', 'Ana Souza');
    click('Voltar');
    expect((screen.getByLabelText('E-mail') as HTMLInputElement).value).toBe('novo@remoa.test');
    click('Continuar');
    expect((screen.getByLabelText('Como podemos te chamar?') as HTMLInputElement).value).toBe('Ana Souza');
  });

  it('não repete o onboarding: sem momento, objetivo ou área', async () => {
    render(<SignUpWizard />);
    await toAbout();
    expect(screen.queryByText(/objetivo/i)).toBeNull();
    expect(screen.queryByRole('radio', { name: '5º–6º ano' })).toBeNull();
  });

  it('G20: "Continuar" só ativa com nome e telefone válidos; valor inválido mostra o erro inline', async () => {
    render(<SignUpWizard />);
    await toAbout();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    type('Como podemos te chamar?', 'Ana Souza');
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled(); // falta o telefone
    type('Telefone', '123');
    expect(screen.getByRole('alert').textContent).toMatch(/telefone com DDD/);
    expect(screen.getByLabelText('Telefone')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    type('Telefone', '11912345678');
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();
    type('Como podemos te chamar?', 'A');
    expect(screen.getByRole('alert').textContent).toMatch(/2 a 60 caracteres/);
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('não pergunta "Você é"; endereço incompleto bloqueia o passo', async () => {
    render(<SignUpWizard />);
    await toAbout();
    fillAbout();
    expect(screen.queryByRole('radio', { name: 'Aluno' })).toBeNull();
    type('Logradouro', 'Rua A');
    click('Continuar');
    expect(screen.getByRole('alert').textContent).toMatch(/Preencha CEP/);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sobre você');
  });

  it('telefone ganha máscara BR enquanto digita', async () => {
    render(<SignUpWizard />);
    await toAbout();
    type('Telefone', '11912345678');
    expect((screen.getByLabelText('Telefone') as HTMLInputElement).value).toBe('(11) 91234-5678');
  });

  it('CEP: busca no ViaCEP com aviso de carga, preenche campos editáveis; não encontrado e falha de rede mostram o aviso', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<SignUpWizard />);
    await toAbout();
    type('CEP', '01310100');
    expect(screen.getByRole('status').textContent).toMatch(/Buscando o CEP/);
    await waitFor(() => expect((screen.getByLabelText('Logradouro') as HTMLInputElement).value).toBe('Avenida Paulista'));
    expect(fetchMock).toHaveBeenCalledWith('https://viacep.com.br/ws/01310100/json/', expect.anything());
    expect((screen.getByLabelText('CEP') as HTMLInputElement).value).toBe('01310-100');
    expect((screen.getByLabelText('Bairro') as HTMLInputElement).value).toBe('Bela Vista');
    expect((screen.getByLabelText('Cidade') as HTMLInputElement).value).toBe('São Paulo');
    expect(screen.getByRole('combobox', { name: 'UF' }).textContent).toContain('SP');
    type('Logradouro', 'Av. Paulista'); // editável

    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ erro: true }) });
    type('CEP', '99999999');
    expect(await screen.findByText('CEP não encontrado')).toBeVisible();

    fetchMock.mockRejectedValue(new Error('offline'));
    type('CEP', '88888888');
    expect(await screen.findByText(/Preencha o endereço à mão/)).toBeVisible();
    vi.unstubAllGlobals();
  });

  it('exige o consentimento (erro visível), envia nome e grava os dados pessoais pelo PATCH, sem nulls', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' }) }));
    render(<SignUpWizard next="/app/mapas" />);
    await toAbout();
    fillAbout();
    fireEvent.click(screen.getByRole('radio', { name: 'Feminino' }));
    type('CEP', '01310100');
    await waitFor(() => expect((screen.getByLabelText('Logradouro') as HTMLInputElement).value).toBe('Avenida Paulista'));
    type('Número', 'S/N');
    click('Continuar');
    click('Criar conta');
    expect(screen.getByRole('alert').textContent).toMatch(/marque que você concorda/);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
    expect(signUp).not.toHaveBeenCalled();
    for (const [name, href] of [['Termos de uso', '/termos-de-uso'], ['Política de Privacidade', '/politica-de-privacidade']] as const) {
      const a = screen.getByRole('link', { name });
      expect(a).toHaveAttribute('href', href);
      expect(a).toHaveAttribute('target', '_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
    }
    fireEvent.click(screen.getByRole('checkbox'));
    click('Criar conta');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/mapas'));
    expect(signUp).toHaveBeenCalledWith({ email: 'novo@remoa.test', password: 'senha-forte-123', name: 'Ana Souza' });
    const [url, init] = api.mock.calls[0]!;
    expect(url).toBe('/v1/account/profile');
    expect(JSON.parse(init.body)).toEqual({
      sex: 'feminino', phone: '+5511912345678',
      address: { cep: '01310100', street: 'Avenida Paulista', number: 'S/N', complement: null, district: 'Bela Vista', city: 'São Paulo', uf: 'SP' },
    });
    vi.unstubAllGlobals();
  });

  it('só nome e telefone: vai ao onboarding e grava só o telefone no PATCH', async () => {
    render(<SignUpWizard />);
    await toAbout();
    fillAbout();
    click('Continuar');
    fireEvent.click(screen.getByRole('checkbox'));
    click('Criar conta');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/onboarding'));
    expect(JSON.parse(api.mock.calls[0]![1].body)).toEqual({ phone: '+5511912345678' });
  });

  it('e-mail já cadastrado volta ao passo 1 com o erro no campo', async () => {
    signUp.mockResolvedValue({ ok: false, error: { code: 'conflict', message: 'x' } });
    render(<SignUpWizard />);
    await toAbout();
    fillAbout();
    click('Continuar');
    fireEvent.click(screen.getByRole('checkbox'));
    click('Criar conta');
    expect((await screen.findByRole('alert')).textContent).toMatch(/Já existe uma conta/);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Criar conta');
    expect((screen.getByLabelText('E-mail') as HTMLInputElement).value).toBe('novo@remoa.test');
  });

  it('com confirmação de e-mail: mostra a tela de confirmação, reenvia e não navega', async () => {
    session = false;
    render(<SignUpWizard />);
    await toAbout();
    fillAbout();
    click('Continuar');
    fireEvent.click(screen.getByRole('checkbox'));
    click('Criar conta');
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Confirme seu e-mail'));
    expect(screen.getByText(/novo@remoa.test/)).toBeVisible();
    expect(push).not.toHaveBeenCalled();
    click('Reenviar e-mail');
    await waitFor(() => expect(resend).toHaveBeenCalledWith({ email: 'novo@remoa.test' }));
    expect(await screen.findByText(/novo link/)).toBeVisible();
  });
});
