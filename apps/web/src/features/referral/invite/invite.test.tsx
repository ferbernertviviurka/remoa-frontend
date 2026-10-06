import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const jar = new Map<string, string>();
const set = vi.fn((k: string, v: string) => void jar.set(k, v));
const del = vi.fn((k: string) => void jar.delete(k));
const reqHeaders = new Headers({ 'x-forwarded-for': '200.1.2.3', 'user-agent': 'Mozilla/5.0 test' });
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined), set, delete: del }),
  headers: async () => reqHeaders,
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } }) }));
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { attributeReferral, claimInvite } from './actions';

const CODE = '4K2F9QXM';
const reply = (body: unknown, ok = true) => ({ ok, json: async () => body });

beforeEach(() => jar.clear());
afterEach(() => vi.clearAllMocks());

describe('claimInvite (cookie rf)', () => {
  it('grava o cookie só com código válido, httpOnly, 30 dias', async () => {
    fetchMock.mockResolvedValue(reply({ ok: true, data: { valid: true, code: CODE, inviterFirstName: 'Ana' } }));
    expect(await claimInvite('4k2f-9qxm')).toEqual({ valid: true });
    expect(set).toHaveBeenCalledWith('rf', CODE, expect.objectContaining({ httpOnly: true, sameSite: 'lax', maxAge: 30 * 86_400 }));
  });

  it('código inválido ou malformado: sem cookie', async () => {
    fetchMock.mockResolvedValue(reply({ ok: true, data: { valid: false } }));
    expect(await claimInvite(CODE)).toEqual({ valid: false });
    expect(await claimInvite('0000')).toEqual({ valid: false }); // malformado nem chega à API
    expect(set).not.toHaveBeenCalled();
  });

  it('primeiro toque: não sobrescreve um rf existente', async () => {
    jar.set('rf', 'AAAAAAAA');
    fetchMock.mockResolvedValue(reply({ ok: true, data: { valid: true, code: CODE, inviterFirstName: null } }));
    await claimInvite(CODE);
    expect(set).not.toHaveBeenCalled();
  });
});

describe('IP/UA do visitante (D-399)', () => {
  it('lookup e atribuição repassam o IP (par confiável, D-537) e user-agent à API (limite por IP e sinal fraco não ficam globais)', async () => {
    vi.stubEnv('PROXY_SHARED_SECRET', 's3cret');
    fetchMock.mockResolvedValue(reply({ ok: true, data: { valid: true, code: CODE, inviterFirstName: null } }));
    await claimInvite(CODE);
    jar.set('rf', CODE);
    fetchMock.mockResolvedValue(reply({ ok: true, data: { attributed: true } }));
    await attributeReferral();
    for (const [, init] of fetchMock.mock.calls) {
      const h = new Headers(init.headers);
      expect(h.get('x-remoa-client-ip')).toBe('200.1.2.3');
      expect(h.get('x-remoa-proxy-secret')).toBe('s3cret');
      expect(h.get('x-forwarded-for')).toBeNull(); // D-537: the API ignores a bare XFF
      expect(h.get('user-agent')).toBe('Mozilla/5.0 test');
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.unstubAllEnvs();
  });
});

describe('attributeReferral', () => {
  it('chama a atribuição uma vez com o código do cookie e apaga o cookie', async () => {
    jar.set('rf', CODE);
    fetchMock.mockResolvedValue(reply({ ok: true, data: { attributed: true } }));
    expect(await attributeReferral()).toEqual({ attributed: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toMatch(/\/v1\/referral\/attribution$/);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ code: CODE });
    expect(del).toHaveBeenCalledWith('rf');
  });

  it('sem cookie: não chama a API', async () => {
    expect(await attributeReferral()).toEqual({ attributed: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falha de rede não lança e mantém o cookie para uma nova tentativa', async () => {
    jar.set('rf', CODE);
    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(attributeReferral()).resolves.toEqual({ attributed: false });
    expect(del).not.toHaveBeenCalled();
  });

  it('recusa do servidor (autoindicação) não é erro: attributed false e cookie apagado', async () => {
    jar.set('rf', CODE);
    fetchMock.mockResolvedValue(reply({ ok: true, data: { attributed: false } }));
    expect(await attributeReferral()).toEqual({ attributed: false });
    expect(del).toHaveBeenCalledWith('rf');
  });
});

describe('InviteView', () => {
  const signUp = vi.fn();
  const attribute = vi.fn();
  const track = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('@/server/auth/actions', () => ({ signUp: (...a: unknown[]) => signUp(...a), signInWithGoogle: vi.fn() }));
    vi.doMock('./actions', () => ({ claimInvite: vi.fn(async () => ({ valid: true })), attributeReferral: (...a: unknown[]) => attribute(...a) }));
    vi.doMock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
    vi.doMock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } }) }));
    signUp.mockResolvedValue({ ok: true });
  });
  afterEach(cleanup);

  async function fill() {
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Maria' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-forte-123' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar conta/ }));
  }

  it('válido: mostra o nome, o consentimento, atribui uma vez e avança para "Conta criada"', async () => {
    attribute.mockResolvedValue({ attributed: true });
    const { InviteView } = await import('./invite-view');
    render(<InviteView valid code={CODE} inviterName="Ana" loggedIn={false} />);
    expect(screen.getByText('Ana convidou você para o Remoa')).toBeTruthy();
    expect(screen.getByText(/Seu nome aparece para quem convidou você/)).toBeTruthy();
    await fill();
    await screen.findByText('Conta criada.');
    expect(attribute).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('referral_signup', { valid: true, method: 'password' });
    expect(screen.getByRole('link', { name: /Criar meu primeiro mapa/ }).getAttribute('href')).toBe('/app/mapas/novo');
  }, 30_000); // first dynamic import of the view (ui + auth) is slow on a loaded machine

  it('falha na atribuição não bloqueia o cadastro', async () => {
    attribute.mockRejectedValue(new Error('boom'));
    const { InviteView } = await import('./invite-view');
    render(<InviteView valid code={CODE} inviterName="Ana" loggedIn={false} />);
    await fill();
    await screen.findByText('Conta criada.');
  });

  it('o cadastro recarrega a árvore com loggedIn=true: "Conta criada" não vira "Você já tem conta"', async () => {
    attribute.mockResolvedValue({ attributed: true });
    const { InviteView } = await import('./invite-view');
    const { rerender } = render(<InviteView valid code={CODE} inviterName="Ana" loggedIn={false} />);
    await fill();
    await screen.findByText('Conta criada.');
    rerender(<InviteView valid code={CODE} inviterName="Ana" loggedIn />);
    expect(screen.getByText('Conta criada.')).toBeTruthy();
    expect(screen.queryByText('Você já tem conta')).toBeNull();
  });

  it('inválido: versão neutra, sem promessa nem consentimento de nome, sem atribuir', async () => {
    const { InviteView } = await import('./invite-view');
    render(<InviteView valid={false} code="" inviterName={null} loggedIn={false} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Crie seu primeiro mapa de estudo.');
    expect(screen.queryByText(/ganha 1 mês/)).toBeNull();
    expect(screen.queryByText(/Seu nome aparece/)).toBeNull();
    await fill();
    await screen.findByText('Conta criada.');
    expect(attribute).not.toHaveBeenCalled();
  });

  it('logado: "Você já tem conta" e link para o app, sem formulário', async () => {
    const { InviteView } = await import('./invite-view');
    render(<InviteView valid code={CODE} inviterName="Ana" loggedIn />);
    expect(screen.getByText('Você já tem conta')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ir para o app' }).getAttribute('href')).toBe('/app/hoje');
    expect(screen.queryByLabelText('E-mail')).toBeNull();
  });
});
