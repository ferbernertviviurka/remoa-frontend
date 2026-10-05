import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ToastProvider } from '@remoa/ui';
import { StoreView } from './store-view';
import { StoreWaitlistSetting } from './account-setting';

// Servidor falso em memória com a forma do contrato (/v1/store/*).
type Row = { email: string; interest: string[]; sellerRole: string | null; updatedAt: string } | null;
let row: Row;
let failConfig = false;
let failWaitlistGet = false;
let failMe = false;
let putError: { code: string; message: string } | null;
const mockGet = () => row;
vi.mock('@/lib/api', () => ({
  api: vi.fn(async (path: string, init?: RequestInit) => {
    if (path === '/v1/account/me') return failMe ? { ok: false, error: { code: 'internal', message: 'x' } } : { ok: true, data: { email: 'ana@exemplo.com' } };
    if (path === '/v1/store/config') return failConfig ? { ok: false, error: { code: 'internal', message: 'x' } } : { ok: true, data: { status: 'soon', splitSellerPct: 85 } };
    if (init?.method === 'PUT') {
      if (putError) return { ok: false, error: putError };
      row = { ...JSON.parse(String(init.body)), updatedAt: '2026-10-04T00:00:00Z' };
      delete (row as Record<string, unknown>).consent;
      return { ok: true, data: row };
    }
    if (init?.method === 'DELETE') { row = null; return { ok: true, data: null }; }
    if (failWaitlistGet) return { ok: false, error: { code: 'internal', message: 'x' } };
    return { ok: true, data: row };
  }),
}));

beforeEach(() => { failConfig = false; failWaitlistGet = false; failMe = false; row = null; putError = null; window.__remoaEvents = []; });
afterEach(cleanup);

const open = async () => {
  render(<StoreView />);
  return screen.findByRole('textbox', { name: 'E-mail' });
};
const join = () => fireEvent.click(screen.getByRole('button', { name: 'Entrar na lista de espera' }));

describe('Loja em breve: falhas de leitura', () => {
  it('só o GET das respostas falhou: formulário continua usável', async () => {
    failWaitlistGet = true;
    await open();
    expect(screen.getByRole('textbox', { name: 'E-mail' })).toHaveValue('ana@exemplo.com');
  });

  it('GET da lista e da conta falham: erro com Tentar de novo, que recarrega', async () => {
    failWaitlistGet = true; failMe = true;
    render(<StoreView />);
    const retry = await screen.findByRole('button', { name: 'Tentar de novo' });
    failWaitlistGet = false; failMe = false;
    fireEvent.click(retry);
    expect(await screen.findByRole('textbox', { name: 'E-mail' })).toBeInTheDocument();
  });

  it('config falha: simulador mostra mensagem neutra em vez de sumir', async () => {
    failConfig = true;
    await open();
    await waitFor(() => expect(screen.getByText(/O simulador não está disponível/)).toBeInTheDocument());
  });
});

describe('Loja em breve', () => {
  it('mostra o aviso permanente, sem datas, e o simulador rotulado como exemplo com o percentual da configuração', async () => {
    await open();
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('A Loja de mapas ainda não está disponível');
    expect(screen.getAllByText('Exemplo ilustrativo').length).toBeGreaterThan(0);
    expect(screen.getByText('Vendedor 85%')).toBeInTheDocument(); // vem de storeConfig.splitSellerPct (mock), não do texto
    expect(screen.getByText('Sem data ainda')).toBeInTheDocument();
  });

  it('prévia travada: aria-disabled, nada focalizável dentro dos cartões, preço com rótulo', async () => {
    await open();
    const cards = document.querySelectorAll('[aria-disabled="true"]');
    expect(cards.length).toBeGreaterThanOrEqual(7); // 6 cartões + filtros
    for (const c of cards) expect(c.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0);
    expect(screen.getAllByLabelText('Preço disponível na abertura')).toHaveLength(6);
  });

  it('abas trocam os passos', async () => {
    await open();
    expect(screen.getByText('Encontre um mapa')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Quero vender' }), { button: 0 });
    expect(screen.getByText('Publique seu mapa')).toBeInTheDocument();
  });

  it('e-mail da conta pré-preenchido e validação das três regras', async () => {
    const email = await open();
    await waitFor(() => expect(email).toHaveValue('ana@exemplo.com'));
    fireEvent.change(email, { target: { value: '' } });
    join();
    expect(screen.getByRole('alert')).toHaveTextContent('Digite um e-mail válido.');
    fireEvent.change(email, { target: { value: 'ana@exemplo.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Quero comprar mapas' })); // desmarca o padrão
    join();
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha se quer comprar, vender ou os dois.');
    fireEvent.click(screen.getByRole('button', { name: 'Quero vender os meus' }));
    join();
    expect(screen.getByRole('alert')).toHaveTextContent('Conte se você é professor');
    expect(mockGet()).toBeNull();
  });

  it('perfil só aparece ao vender; envia, mostra sucesso e permite alterar as respostas', async () => {
    const email = await open();
    await waitFor(() => expect(email).toHaveValue('ana@exemplo.com'));
    expect(screen.queryByRole('group', { name: 'Quem você é' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quero vender os meus' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Quem você é' })).getByRole('button', { name: 'Professor' }));
    join();
    expect(await screen.findByText('Você está na lista.')).toBeInTheDocument();
    expect(screen.getByText(/entramos em contato antes/)).toBeInTheDocument();
    expect(mockGet()).toMatchObject({ email: 'ana@exemplo.com', interest: ['buy', 'sell'], sellerRole: 'teacher' });

    fireEvent.click(screen.getByRole('button', { name: 'Alterar minhas respostas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quero vender os meus' })); // volta a só comprar
    join();
    expect(await screen.findByText('Avisamos por e-mail quando a loja abrir.')).toBeInTheDocument();
    expect(mockGet()).toMatchObject({ interest: ['buy'], sellerRole: null });
  });
});

describe('Erros e telemetria', () => {
  it('429 rate_limited e 409 viram mensagens próprias', async () => {
    await open();
    putError = { code: 'rate_limited', message: 'x' };
    join();
    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas');
    putError = { code: 'conflict', message: 'x' };
    join();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('não está aberta'));
  });

  it('dispara store_viewed, store_waitlist_joined sem e-mail e store_faq_opened', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Quando a loja abre?' }));
    join();
    await screen.findByText('Você está na lista.');
    await waitFor(() => expect((window.__remoaEvents ?? []).map((e) => e.event)).toEqual(expect.arrayContaining(['store_viewed', 'store_faq_opened', 'store_waitlist_joined'])));
    const joined = window.__remoaEvents?.findLast((e) => e.event === 'store_waitlist_joined');
    expect(joined?.props).toMatchObject({ interest: 'buy', role: null });
    expect(JSON.stringify(window.__remoaEvents)).not.toContain('@');
  });
});

describe('Minha conta: sair da lista', () => {
  it('só aparece para quem está na lista e remove a inscrição', async () => {
    const view = () => render(<ToastProvider closeLabel="Fechar" viewportLabel="Avisos"><StoreWaitlistSetting /></ToastProvider>);
    const first = view();
    expect(screen.queryByRole('button', { name: 'Sair da lista' })).not.toBeInTheDocument();
    first.unmount();
    row = { email: 'a@b.co', interest: ['buy'], sellerRole: null, updatedAt: '' };
    view();
    fireEvent.click(await screen.findByRole('button', { name: 'Sair da lista' }));
    await waitFor(() => expect(mockGet()).toBeNull());
    expect(screen.queryByRole('button', { name: 'Sair da lista' })).not.toBeInTheDocument();
  });
});
