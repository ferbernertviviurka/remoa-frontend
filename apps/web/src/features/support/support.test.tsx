import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supportMocks as mocks } from '@remoa/contracts/mocks';
import { t } from '@remoa/strings';
import { api } from '@/lib/api';
import { track } from '@/lib/analytics';
import { SupportLauncher } from './support-launcher';

const nav = vi.hoisted(() => ({ path: '/app/hoje', query: '' }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.path,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.query),
}));
vi.mock('@/lib/api', () => ({ api: vi.fn() }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

// @testing-library/user-event is not a dependency of this repo: minimal equivalents on fireEvent.
const userEvent = {
  click: async (el: Element) => { fireEvent.click(el); },
  type: async (el: Element, text: string) => { fireEvent.change(el, { target: { value: (el as HTMLInputElement).value + text } }); },
  keyboard: async (k: string) => { fireEvent.keyDown(document.activeElement ?? document.body, { key: k.replace(/[{}]/g, '') }); },
  upload: async (el: Element, f: File) => { fireEvent.change(el, { target: { files: [f] } }); },
};
const apiMock = vi.mocked(api);
const U = 'u1';
let failSubmit = false;
const body = (init?: RequestInit) => JSON.parse(String(init?.body));
function serve() {
  apiMock.mockImplementation((async (path: string, init?: RequestInit) => {
    const m = init?.method ?? 'GET';
    let hit: RegExpMatchArray | null;
    if (path === '/v1/account/me') return { ok: true, data: { email: 'ana@remoa.test', entitlements: { plan: 'pro' } } };
    if (path === '/v1/support/unread') return mocks.getSupportUnread(U);
    if (path === '/v1/support/tickets' && m === 'GET') return mocks.listMyTickets(U);
    if (path === '/v1/support/tickets' && failSubmit) { failSubmit = false; throw new Error('offline'); }
    if (path === '/v1/support/tickets') return mocks.submitSupportTicket(U, body(init));
    if (path === '/v1/support/attachments/sign') return mocks.signSupportAttachment(U, body(init));
    if ((hit = path.match(/^\/v1\/support\/tickets\/([^/]+)\/read$/))) return mocks.markTicketRead(U, hit[1]!);
    if ((hit = path.match(/^\/v1\/support\/tickets\/([^/]+)\/messages$/))) return mocks.replyToTicket(U, hit[1]!, body(init));
    if ((hit = path.match(/^\/v1\/support\/tickets\/([^/]+)$/))) return mocks.getMyTicket(U, hit[1]!);
    throw new Error(path);
  }) as never);
}
const sent = () => apiMock.mock.calls.filter(([p, i]) => p === '/v1/support/tickets' && i?.method === 'POST').map(([, i]) => body(i));
const fab = () => screen.getByRole('button', { name: new RegExp(t('support.floatingButton.ariaLabel')) });
const subject = 'O mapa não salva a conexão';
const description = 'Quando ligo dois cards a conexão some depois de recarregar.';

async function openForm() {
  render(<SupportLauncher />);
  await userEvent.click(fab());
  return screen.findByRole('dialog', { name: t('support.modal.title') });
}
async function fill(user = userEvent) {
  await user.click(screen.getByRole('button', { name: t('support.form.type.options.broken') }));
  await user.type(screen.getByLabelText(t('support.form.subject.label')), subject);
  await user.type(screen.getByLabelText(t('support.form.description.label')), description);
}
const submitBtn = () => screen.getByRole('button', { name: t('support.form.submit') });

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); // Radix Switch in jsdom
  mocks.reset(); localStorage.clear(); nav.path = '/app/hoje'; nav.query = '';
  apiMock.mockReset(); vi.mocked(track).mockClear(); serve();
  Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/129.0.0.0 Safari/537.36', configurable: true });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('botão e badge', () => {
  it('mostra as respostas não lidas, abre com o evento e some nas telas cheias', async () => {
    const { unmount } = render(<SupportLauncher />);
    expect(await screen.findByTestId('support-fab-badge')).toHaveTextContent('1');
    expect(fab()).toHaveAccessibleName(`${t('support.floatingButton.ariaLabel')}, ${t('support.floatingButton.unreadCount', { count: 1 })}`);
    unmount();
    nav.path = '/app/mapas/abc';
    render(<SupportLauncher />);
    expect(screen.queryByRole('button', { name: new RegExp(t('support.floatingButton.ariaLabel')) })).toBeNull();
  });

  it('consulta a cada 60 s e de novo ao fechar o modal', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<SupportLauncher />);
    const unreadCalls = () => apiMock.mock.calls.filter(([p]) => p === '/v1/support/unread').length;
    await waitFor(() => expect(unreadCalls()).toBe(1));
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(unreadCalls()).toBe(2);
    fireEvent.click(fab());
    fireEvent.click(await screen.findByRole('button', { name: t('support.modal.close') }));
    await waitFor(() => expect(unreadCalls()).toBe(3));
  });
});

describe('modal', () => {
  it('foco volta ao botão ao fechar', async () => {
    await openForm();
    await userEvent.click(screen.getByRole('button', { name: t('support.modal.close') }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(fab()).toHaveFocus();
    expect(track).toHaveBeenCalledWith('support_opened', { from: 'fab' });
  });

  it('com texto não enviado pede confirmação; continuar editando mantém o modal', async () => {
    await openForm();
    await userEvent.type(screen.getByLabelText(t('support.form.subject.label')), 'abc');
    await userEvent.keyboard('{Escape}');
    const confirm = await screen.findByRole('dialog', { name: t('support.modal.unsavedTitle') });
    await userEvent.click(within(confirm).getByRole('button', { name: t('support.modal.keepEditing') }));
    expect(screen.getByRole('dialog', { name: t('support.modal.title') })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(within(await screen.findByRole('dialog', { name: t('support.modal.unsavedTitle') })).getByRole('button', { name: t('support.modal.discard') }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(localStorage.getItem('remoa-support-draft')).toBeNull();
  });

  it('sem texto fecha direto no Esc', async () => {
    await openForm();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('formulário', () => {
  it('envio desabilitado até ficar válido, com mensagem específica e e-mail da conta', async () => {
    await openForm();
    expect(submitBtn()).toBeDisabled();
    await waitFor(() => expect(screen.getByText('ana@remoa.test')).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(t('support.form.subject.label')), 'abc');
    expect(screen.getByText(t('support.form.type.required'))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t('support.form.type.options.billing') }));
    expect(screen.getByText(t('support.form.subject.error'))).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(t('support.form.subject.label')), 'defgh');
    expect(screen.getByText(t('support.form.description.error'))).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(t('support.form.description.label')), description);
    expect(submitBtn()).toBeEnabled();
  });

  it('envia exatamente a lista branca de contexto e mostra o número', async () => {
    await openForm();
    await fill();
    await waitFor(() => expect(screen.getByText('ana@remoa.test')).toBeInTheDocument());
    // the visible list is what is sent
    await userEvent.click(screen.getByRole('button', { name: t('support.technical.title') }));
    expect(screen.getByText('/app/hoje')).toBeInTheDocument();
    await userEvent.click(submitBtn());
    expect(await screen.findByText(t('support.submission.success', { number: 1043 }))).toBeInTheDocument();
    expect(sent()).toEqual([{
      type: 'bug', subject, description, attachments: [],
      context: { screen: '/app/hoje', plan: 'pro', browser: 'Chrome 129', os: 'macOS', appVersion: '0.1.0', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    }]);
    expect(track).toHaveBeenCalledWith('support_submitted', { type: 'bug', hasAttachment: false, context: true });
    expect(localStorage.getItem('remoa-support-draft')).toBeNull();
    // "Ver meus chamados" lands on the list, with the new ticket in it
    await userEvent.click(screen.getByRole('button', { name: t('support.successScreen.viewTickets') }));
    expect(await screen.findByText(new RegExp('#1043'))).toBeInTheDocument();
  });

  it('interruptor desligado não envia contexto', async () => {
    await openForm();
    await fill();
    await userEvent.click(screen.getByRole('switch', { name: t('support.technical.toggle') }));
    await userEvent.click(submitBtn());
    await screen.findByText(t('support.submission.success', { number: 1043 }));
    expect(sent()[0].context).toBeNull();
    expect(track).toHaveBeenCalledWith('support_submitted', { type: 'bug', hasAttachment: false, context: false });
  });

  it('erro mantém o rascunho e oferece tentar de novo', async () => {
    await openForm();
    await fill();
    failSubmit = true;
    await userEvent.click(submitBtn());
    const retry = await screen.findByRole('button', { name: t('support.submission.tryAgain') });
    expect(JSON.parse(localStorage.getItem('remoa-support-draft')!)).toMatchObject({ subject });
    await userEvent.click(retry);
    await screen.findByText(t('support.submission.success', { number: 1043 }));
    expect(sent()).toHaveLength(2);
  });

  it('rascunho de até 24 h volta ao reabrir', async () => {
    localStorage.setItem('remoa-support-draft', JSON.stringify({ type: 'billing', subject: 'Pix pago', description: '', at: Date.now() - 3_600_000 }));
    await openForm();
    expect(screen.getByLabelText(t('support.form.subject.label'))).toHaveValue('Pix pago');
    cleanup();
    localStorage.setItem('remoa-support-draft', JSON.stringify({ type: 'billing', subject: 'velho', description: '', at: Date.now() - 25 * 3_600_000 }));
    await openForm();
    expect(screen.getByLabelText(t('support.form.subject.label'))).toHaveValue('');
  });

  it('anexa: assina, envia por PUT e manda só a chave', async () => {
    const put = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    await openForm();
    await fill();
    const file = new File(['x'], 'tela.png', { type: 'image/png' });
    await userEvent.upload(document.querySelector('input[type=file]')!, file);
    expect(screen.getByText('tela.png')).toBeInTheDocument();
    await userEvent.click(submitBtn());
    await screen.findByText(t('support.submission.success', { number: 1043 }));
    expect(put).toHaveBeenCalledWith(expect.stringContaining('/mock-upload/support/u1/'), expect.objectContaining({ method: 'PUT' }));
    expect(sent()[0].attachments).toHaveLength(1);
    expect(sent()[0].attachments[0]).toMatch(/^support\/u1\//);
    put.mockRestore();
  });

  it('recusa arquivo que não é PNG ou JPG', async () => {
    await openForm();
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } });
    expect(screen.getByRole('alert')).toHaveTextContent(t('support.form.attachments.error'));
  });
});

describe('meus chamados', () => {
  it('abre a conversa pelo link ?suporte=, marca como lido e o badge some', async () => {
    nav.query = 'suporte=1042';
    render(<SupportLauncher />);
    expect(await screen.findByRole('log', { name: t('support.thread.ariaLabel', { number: 1042 }) })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('support_opened', { from: 'email_link' });
    await waitFor(() => expect(screen.queryByTestId('support-fab-badge')).toBeNull());
  });

  it('aceita o UUID do e-mail, chama /read e some o badge', async () => {
    nav.query = 'suporte=00000000-0000-4000-8000-000000007002';
    const tickets = await mocks.listMyTickets(U);
    nav.query = `suporte=${tickets.ok ? tickets.data.find((k) => k.number === 1042)!.id : ''}`;
    render(<SupportLauncher />);
    expect(await screen.findByRole('log', { name: t('support.thread.ariaLabel', { number: 1042 }) })).toBeInTheDocument();
    expect(apiMock.mock.calls.some(([p, i]) => /\/read$/.test(String(p)) && i?.method === 'POST')).toBe(true);
    await waitFor(() => expect(screen.queryByTestId('support-fab-badge')).toBeNull());
  });

  it('lista, abre e responde sem mandar texto ao analytics', async () => {
    await openForm();
    await userEvent.click(screen.getByRole('tab', { name: new RegExp(t('support.modal.tabMyTickets')) }));
    await userEvent.click(await screen.findByRole('button', { name: /Mapa não salva a conexão/ }));
    await userEvent.type(await screen.findByLabelText(t('support.thread.replyLabel')), 'Testei e funcionou, obrigado.');
    await userEvent.click(screen.getByRole('button', { name: t('support.thread.reply') }));
    expect(await screen.findByText('Testei e funcionou, obrigado.')).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('support_replied', {});
  });
});

describe('sortTickets', () => {
  it('puts unread/answered first, then most recent update', async () => {
    const { sortTickets } = await import('./my-tickets');
    const k = (id: string, status: string, unread: boolean, updatedAt: string) => ({ id, status, unread, updatedAt }) as never;
    const out = sortTickets([k('a', 'open', false, '2026-10-03'), k('b', 'resolved', false, '2026-10-04'), k('c', 'answered', true, '2026-10-01')]);
    expect(out.map((x: { id: string }) => x.id)).toEqual(['c', 'b', 'a']);
  });
});
