import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
vi.mock('@/features/study-profile/api', async () => {
  const f = await import('@/features/study-profile/fixtures');
  return {
    listCourses: async () => ({ ok: true, data: f.COURSES }),
    listGoals: async (course?: string) => ({ ok: true, data: f.goalsFor(course) }),
    searchInstitutions: async () => ({ ok: true, data: [] }),
    suggestReference: vi.fn(async () => ({ ok: true, data: null })),
  };
});
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: session ? { id: 'u1' } : null } }) } }) }));

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); // Radix (radio/checkbox) in jsdom
  session = true;
  sessionStorage.clear();
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
  const fillAccount = (pw = 'senha-forte-123') => {
    type('Seu nome', 'Ana Souza');
    type('E-mail', 'novo@remoa.test');
    type('Senha', pw);
  };
  const pickOption = async (label: string, text: string, option: string) => {
    fireEvent.change(await screen.findByRole('combobox', { name: label }), { target: { value: text } }); // step 2 loads after the first paint
    await waitFor(() => expect(screen.getAllByRole('option').some((o) => o.textContent?.startsWith(option))).toBe(true));
    fireEvent.click(screen.getAllByRole('option').find((o) => o.textContent?.startsWith(option))!);
  };
  // "Seu estudo" downloads after the first paint (P-514): wait for it
  const toStudy = async () => { fillAccount(); click('Continuar'); await screen.findByRole('combobox', { name: 'Curso ou área' }); };
  const toReview = async (course = 'enfermagem', option = 'Enfermagem') => {
    await toStudy();
    await pickOption('Curso ou área', course, option);
    click('Continuar');
    await screen.findByText('Confira e crie a conta');
  };
  const create = () => { fireEvent.click(screen.getByRole('checkbox')); click('Criar conta'); };

  it('passo 1: nome, e-mail válido e senha forte', () => {
    render(<SignUpWizard />);
    expect(screen.getByRole('listitem', { current: 'step' }).textContent).toContain('Conta');
    type('E-mail', 'novo@remoa.test');
    type('Senha', 'abcdefgh'); // 8 sem número: o servidor aceita, a política do F13 não
    click('Continuar');
    expect(screen.getAllByRole('alert').map((a) => a.textContent).join(' ')).toMatch(/Informe o seu nome.*letras e números/);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Crie a sua conta');
  });

  it('passo 2 exige curso e um foco; voltar não perde o digitado', async () => {
    render(<SignUpWizard />);
    await toStudy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Seu estudo');
    click('Continuar');
    expect(screen.getByText('Escolha o seu curso e pelo menos um foco de estudo.')).toBeVisible();
    await pickOption('Curso ou área', 'enfermagem', 'Enfermagem');
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    click('Continuar');
    expect(screen.getAllByText('Escolha pelo menos um foco de estudo.').length).toBeGreaterThan(0);
    click('Voltar');
    expect((screen.getByLabelText('Seu nome') as HTMLInputElement).value).toBe('Ana Souza');
  });

  it('D-1862: o cadastro não pede o número no conselho (vai para a Conta, nunca para os metadados)', async () => {
    render(<SignUpWizard />);
    await toStudy();
    act(() => screen.getByRole('radio', { name: 'Profissional formado(a)' }).click());
    await pickOption('Curso ou área', 'enfermagem', 'Enfermagem');
    expect(screen.queryByLabelText('Número no conselho (opcional)')).toBeNull();
  });

  it('cria a conta com o estudo nos metadados e mostra o próximo passo (Criar meu primeiro mapa)', async () => {
    render(<SignUpWizard />);
    await toReview();
    expect(screen.getByText('Situação').nextSibling?.textContent).toBe('Estudante');
    expect(screen.getByText('Objetivos').nextSibling?.textContent).toBe('Provas da faculdade');
    click('Criar conta');
    expect(screen.getAllByRole('alert').map((a) => a.textContent).join(' ')).toMatch(/marque que você concorda/);
    expect(signUp).not.toHaveBeenCalled();
    for (const [name, href] of [['Termos de uso', '/termos-de-uso'], ['Política de Privacidade', '/politica-de-privacidade']] as const) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
    create();
    expect(await screen.findByRole('heading', { name: 'Conta criada, Ana Souza!' })).toBeVisible();
    expect(screen.getByText('Estudante de Enfermagem · 1º período. Foco: Provas da faculdade.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Criar meu primeiro mapa' })).toHaveAttribute('href', '/app/onboarding');
    expect(screen.queryByRole('link', { name: 'Abrir os mapas do ENAMED' })).toBeNull();
    const arg = signUp.mock.calls[0]![0];
    expect(arg).toMatchObject({ email: 'novo@remoa.test', password: 'senha-forte-123', name: 'Ana Souza', next: '/app/onboarding' });
    expect(arg.studyProfile).toMatchObject({ situation: 'graduacao', course: 'nursing', period: 1, goals: ['provas_faculdade'], context: 'signup' });
    expect(push).not.toHaveBeenCalled();
  });

  it('Medicina estudante: "Abrir os mapas do ENAMED" passa pelo onboarding', async () => {
    render(<SignUpWizard />);
    await toReview('medic', 'Medicina');
    create();
    const link = await screen.findByRole('link', { name: 'Abrir os mapas do ENAMED' });
    expect(link).toHaveAttribute('href', `/app/onboarding?next=${encodeURIComponent('/app/cobertura')}`);
  });

  it('?plano= mostra o plano escolhido e leva ao pagamento; ?curso= já vem escolhido', async () => {
    render(<SignUpWizard plan="pro_annual" course="pharmacy" />);
    expect(screen.getByText('Plano escolhido:').parentElement?.textContent).toBe('Plano escolhido: Pro anual. Você pode mudar depois.');
    await toStudy();
    await waitFor(() => expect((screen.getByRole('combobox', { name: 'Curso ou área' }) as HTMLInputElement).value).toBe('Farmácia'));
    click('Continuar');
    await screen.findByText('Confira e crie a conta');
    create();
    const plan = await screen.findByRole('link', { name: 'Continuar com o plano Pro anual' });
    const dest = `/app/onboarding?next=${encodeURIComponent('/app/planos?periodo=anual')}`;
    expect(plan).toHaveAttribute('href', dest);
    expect(signUp.mock.calls[0]![0].next).toBe(dest);
  });

  it('rascunho local: volta com nome, e-mail e estudo, nunca com a senha', async () => {
    const { unmount } = render(<SignUpWizard />);
    await toStudy();
    await pickOption('Curso ou área', 'enfermagem', 'Enfermagem');
    const saved = JSON.parse(sessionStorage.getItem('remoa:signup-draft')!);
    expect(saved).toMatchObject({ email: 'novo@remoa.test', name: 'Ana Souza', study: { course: 'nursing' } });
    expect(JSON.stringify(saved)).not.toContain('senha-forte-123');
    unmount();
    render(<SignUpWizard />);
    await waitFor(() => expect((screen.getByLabelText('E-mail') as HTMLInputElement).value).toBe('novo@remoa.test'));
    expect((screen.getByLabelText('Senha') as HTMLInputElement).value).toBe('');
    type('Senha', 'senha-forte-123');
    click('Continuar');
    expect((screen.getByRole('combobox', { name: 'Curso ou área' }) as HTMLInputElement).value).toBe('Enfermagem');
  });

  it('e-mail já cadastrado volta ao passo 1 com o erro no campo', async () => {
    signUp.mockResolvedValue({ ok: false, error: { code: 'conflict', message: 'x' } });
    render(<SignUpWizard />);
    await toReview();
    create();
    expect((await screen.findByRole('alert')).textContent).toMatch(/Já existe uma conta/);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Crie a sua conta');
    expect((screen.getByLabelText('E-mail') as HTMLInputElement).value).toBe('novo@remoa.test');
  });

  it('com confirmação de e-mail: mostra a tela de confirmação, reenvia e não navega', async () => {
    session = false;
    render(<SignUpWizard />);
    await toReview();
    create();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Confirme seu e-mail'));
    expect(screen.getByText(/novo@remoa.test/)).toBeVisible();
    expect(push).not.toHaveBeenCalled();
    click('Reenviar e-mail');
    await waitFor(() => expect(resend).toHaveBeenCalledWith({ email: 'novo@remoa.test' }));
  });
});
