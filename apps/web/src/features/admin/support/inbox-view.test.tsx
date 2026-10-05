import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { AdminTicketDetail, AdminTicketPage } from '@remoa/contracts';

const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }));
const runAdminAction = vi.fn();
vi.mock('../shared/actions', () => ({ runAdminAction: (...a: unknown[]) => runAdminAction(...a) }));
const { InboxView } = await import('./inbox-view');

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });

const now = new Date();
const user = { id: 'u1', name: 'Hugo Pires', email: 'hugo@x.com' };
const row = { id: 't1', number: 1044, user, type: 'bug', subject: 'Mapa não salva', preview: 'Salvei e sumiu tudo', status: 'open', assignedTo: null, lastUserMessageAt: now, createdAt: now } as const;
const page: AdminTicketPage = { items: [row], total: 1, page: 1, pageSize: 100, counts: { all: 9, open: 3, in_review: 2, answered: 2, resolved: 2, unassigned: 4 } };
const ticket: AdminTicketDetail = {
  ...row, plan: 'free',
  context: { screen: '/app/mapas', plan: 'free', browser: 'Chrome 129', os: 'macOS', appVersion: '0.1.0', timezone: 'America/Sao_Paulo' },
  messages: [
    { id: 'm1', authorType: 'user', author: user, body: 'Não salvou.', internal: false, attachments: [{ id: 'a1', mime: 'image/png', sizeBytes: 10, url: 'https://x.test/a.png' }], createdAt: now },
    { id: 'm2', authorType: 'admin', author: { id: 'a', name: 'Vc', email: null }, body: 'Segredo da equipe', internal: true, attachments: [], createdAt: now },
  ],
};
const q = { status: '', q: '', t: '' };

describe('Caixa de entrada', () => {
  it('shows the last-message preview and the open / unassigned subtitle', () => {
    render(<InboxView page={page} ticket={null} query={q} />);
    expect(screen.getByText('Salvei e sumiu tudo')).toBeInTheDocument();
    expect(screen.getByText('3 abertos · 4 sem responsável')).toBeInTheDocument();
  });

  it('filter tabs show counts and write the status to the URL; selecting writes ?t=', () => {
    render(<InboxView page={page} ticket={null} query={q} />);
    expect(screen.getByRole('button', { name: /Em análise\s*2/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Respondido/ }));
    expect(replace).toHaveBeenLastCalledWith('/admin/suporte?status=answered', { scroll: false });
    fireEvent.click(screen.getByRole('button', { name: /Mapa não salva/ }));
    expect(replace).toHaveBeenLastCalledWith('/admin/suporte?t=t1', { scroll: false });
  });

  it('search is debounced into ?q=', () => {
    vi.useFakeTimers();
    render(<InboxView page={page} ticket={null} query={q} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'pix' } });
    expect(replace).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(replace).toHaveBeenCalledWith('/admin/suporte?q=pix', { scroll: false });
  });

  it('shows header, user link, technical info, attachment and an amber internal note', () => {
    render(<InboxView page={page} ticket={ticket} query={{ ...q, t: 't1' }} />);
    expect(screen.getByRole('link', { name: 'Hugo Pires' })).toHaveAttribute('href', '/admin/usuarios?u=u1');
    expect(screen.getByText('Tela: /app/mapas · Chrome 129 no macOS · app 0.1.0')).toBeInTheDocument();
    expect(screen.getByAltText('Anexo enviado pelo usuário')).toHaveAttribute('src', 'https://x.test/a.png');
    expect(screen.getByText('Segredo da equipe').closest('[data-internal]')).toBeTruthy();
    expect(screen.getByRole('log')).toBeInTheDocument();
  });

  it('macro fills the composer; reply posts internal=false then refreshes', async () => {
    runAdminAction.mockResolvedValue({ ok: true, auditId: 'a_1', data: {} });
    render(<InboxView page={page} ticket={ticket} query={{ ...q, t: 't1' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Estamos investigando' }));
    expect((screen.getByLabelText('Resposta') as HTMLTextAreaElement).value).toMatch(/Já estamos investigando/);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar resposta' }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(runAdminAction).toHaveBeenCalledWith('/tickets/t1/messages', expect.objectContaining({ internal: false, reason: 'Atendimento do chamado #1044' }));
    expect(screen.getByLabelText('Resposta')).toHaveValue('');
  });

  it('internal toggle restyles the composer and sends internal=true', async () => {
    runAdminAction.mockResolvedValue({ ok: true, auditId: 'a_1', data: {} });
    const { container } = render(<InboxView page={page} ticket={ticket} query={{ ...q, t: 't1' }} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Nota interna' }));
    expect(container.querySelector('[data-internal="true"]')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Resposta'), { target: { value: 'lembrar de checar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nota interna' }));
    await waitFor(() => expect(runAdminAction).toHaveBeenCalledWith('/tickets/t1/messages', expect.objectContaining({ body: 'lembrar de checar', internal: true })));
  });

  it('assign and resolve call their endpoints; failure shows an alert', async () => {
    runAdminAction.mockResolvedValueOnce({ ok: true, auditId: 'a_1', data: {} }).mockResolvedValueOnce({ ok: false, error: { code: 'invalid_state', message: 'x' } });
    render(<InboxView page={page} ticket={ticket} query={{ ...q, t: 't1' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Atribuir a mim' }));
    await waitFor(() => expect(runAdminAction).toHaveBeenCalledWith('/tickets/t1/assign', expect.anything()));
    fireEvent.click(screen.getByRole('button', { name: /Marcar como resolvido/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar');
    expect(runAdminAction).toHaveBeenLastCalledWith('/tickets/t1/resolve', expect.anything());
  });
});
