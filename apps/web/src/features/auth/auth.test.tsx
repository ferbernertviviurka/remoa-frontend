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
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
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

  const toAbout = () => { fillAccount(); click('Continuar'); };
  const pickType = (name = 'Aluno') => fireEvent.click(screen.getByRole('radio', { name }));

  it('avança, volta sem perder o digitado e marca o passo atual', () => {
    render(<SignUpWizard />);
    toAbout();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sobre você');
    expect(screen.getByRole('listitem', { current: 'step' }).textContent).toContain('Sobre você');
    type('Como podemos te chamar?', 'Ana Souza');
    click('Voltar');
    expect((screen.getByLabelText('E-mail') as HTMLInputElement).value).toBe('novo@remoa.test');
    click('Continuar');
    expect((screen.getByLabelText('Como podemos te chamar?') as HTMLInputElement).value).toBe('Ana Souza');
  });

  it('não repete o onboarding: sem momento, objetivo ou área', () => {
    render(<SignUpWizard />);
    toAbout();
    expect(screen.queryByText(/objetivo/i)).toBeNull();
    expect(screen.queryByRole('radio', { name: '5º–6º ano' })).toBeNull();
  });

  it('tipo de usuário é obrigatório; telefone inválido e endereço incompleto bloqueiam o passo', () => {
    render(<SignUpWizard />);
    toAbout();
    click('Continuar');
    expect(screen.getByRole('alert').textContent).toMatch(/Escolha uma opção/);
    pickType('Professor');
    type('Telefone (opcional)', '123');
    click('Continuar');
    expect(screen.getByRole('alert').textContent).toMatch(/telefone com DDD/);
    type('Telefone (opcional)', '');
    type('Logradouro', 'Rua A');
    click('Continuar');
    expect(screen.getByRole('alert').textContent).toMatch(/Preencha CEP/);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sobre você');
  });

  it('telefone ganha máscara BR enquanto digita', () => {
    render(<SignUpWizard />);
    toAbout();
    type('Telefone (opcional)', '11912345678');
    expect((screen.getByLabelText('Telefone (opcional)') as HTMLInputElement).value).toBe('(11) 91234-5678');
  });

  it('CEP: busca no ViaCEP com aviso de carga, preenche campos editáveis; não encontrado e falha de rede mostram o aviso', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<SignUpWizard />);
    toAbout();
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
    toAbout();
    type('Como podemos te chamar?', 'Ana Souza');
    pickType('Médico formado');
    fireEvent.click(screen.getByRole('radio', { name: 'Feminino' }));
    type('Telefone (opcional)', '11912345678');
    type('CEP', '01310100');
    await waitFor(() => expect((screen.getByLabelText('Logradouro') as HTMLInputElement).value).toBe('Avenida Paulista'));
    type('Número', 'S/N');
    click('Continuar');
    expect(screen.getByText('Médico formado', { selector: 'dd' })).toBeVisible();
    click('Criar conta');
    expect(screen.getByRole('alert').textContent).toMatch(/marque que você concorda/);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
    expect(signUp).not.toHaveBeenCalled();
    for (const [name, href] of [['Termos de uso', '/termos'], ['Política de Privacidade', '/privacidade']] as const) {
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
      userType: 'medico_formado', sex: 'feminino', phone: '+5511912345678',
      address: { cep: '01310100', street: 'Avenida Paulista', number: 'S/N', complement: null, district: 'Bela Vista', city: 'São Paulo', uf: 'SP' },
    });
    vi.unstubAllGlobals();
  });

  it('só o tipo de usuário: o PATCH leva apenas userType', async () => {
    render(<SignUpWizard />);
    toAbout();
    pickType();
    click('Continuar');
    fireEvent.click(screen.getByRole('checkbox'));
    click('Criar conta');
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(JSON.parse(api.mock.calls[0]![1].body)).toEqual({ userType: 'aluno' });
  });

  it('e-mail já cadastrado volta ao passo 1 com o erro no campo', async () => {
    signUp.mockResolvedValue({ ok: false, error: { code: 'conflict', message: 'x' } });
    render(<SignUpWizard />);
    toAbout();
    pickType();
    click('Continuar');
    fireEvent.click(screen.getByRole('checkbox'));
    click('Criar conta');
    expect((await screen.findByRole('alert')).textContent).toMatch(/Já existe uma conta/);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Criar conta');
    expect((screen.getByLabelText('E-mail') as HTMLInputElement).value).toBe('novo@remoa.test');
  });
});
