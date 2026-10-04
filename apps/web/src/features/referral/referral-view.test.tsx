import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { referralSummaryFixtures } from '@remoa/contracts/mocks';
import type { ReferralSummary } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { api } from '@/lib/api';
import { track } from '@/lib/analytics';
import { ReferralView } from './referral-view';
import { ReferralProvider } from './reward/referral-provider';

vi.mock('@/lib/api', () => ({ api: vi.fn() }));
let pending = false;
vi.mock('@/features/shell/entitlements', () => ({ useEntitlements: () => ({ entitlements: { referralPending: pending }, status: 'ready', refresh: async () => {} }) }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('next/link', () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));

const apiMock = vi.mocked(api);
const clone = (s: ReferralSummary): ReferralSummary => structuredClone(s);
let current: ReferralSummary;
function serve() {
  apiMock.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === '/v1/referral/summary') return { ok: true, data: clone(current) } as never;
    if (path === '/v1/referral/invites') return { ok: true, data: { sent: JSON.parse(String(init?.body)).emails.length, invitesLeftToday: 10 } } as never;
    throw new Error(path);
  });
}
async function open(summary: ReferralSummary = referralSummaryFixtures.inProgress, from?: string) {
  current = summary;
  serve();
  render(<ReferralProvider><ReferralView from={from} /></ReferralProvider>);
  await screen.findByRole('heading', { name: t('referral.link.title') });
}

beforeEach(() => { pending = false; localStorage.clear(); vi.mocked(track).mockClear(); apiMock.mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('/app/indicar', () => {
  it('registra a origem (?de=) e cai em direct se desconhecida', async () => {
    await open(undefined, 'navbar');
    expect(track).toHaveBeenCalledWith('referral_page_viewed', { from: 'navbar' });
    cleanup();
    vi.mocked(track).mockClear();
    await open(undefined, 'lixo');
    expect(track).toHaveBeenCalledWith('referral_page_viewed', { from: 'direct' });
  });

  it('copiar o link usa a área de transferência e dispara referral_link_copied', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await open();
    fireEvent.click(screen.getByRole('button', { name: t('referral.link.copy') }));
    await screen.findAllByText(t('referral.link.copied'));
    expect(writeText).toHaveBeenCalledWith(referralSummaryFixtures.inProgress.link);
    expect(track).toHaveBeenCalledWith('referral_link_copied', {});
  });

  it('WhatsApp abre wa.me com a mensagem e o link; o link apagado é reinserido', async () => {
    const open_ = vi.spyOn(window, 'open').mockReturnValue(null);
    await open();
    const box = screen.getByLabelText(t('referral.message.label'));
    fireEvent.change(box, { target: { value: 'Oi, vem estudar comigo' } });
    fireEvent.click(screen.getByRole('button', { name: t('referral.share.whatsapp') }));
    const url = new URL(open_.mock.calls[0]![0] as string);
    expect(url.host).toBe('wa.me');
    expect(url.searchParams.get('text')).toBe(`Oi, vem estudar comigo ${referralSummaryFixtures.inProgress.link}`);
    expect(track).toHaveBeenCalledWith('referral_share_clicked', { channel: 'whatsapp' });
  });

  it('"Mais opções" sem Web Share copia a mensagem', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    await open();
    fireEvent.click(screen.getByRole('button', { name: t('referral.share.more') }));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(track).toHaveBeenCalledWith('referral_share_clicked', { channel: 'more' });
  });

  it('mensagem: conta caracteres, guarda só no navegador e restaura o texto padrão', async () => {
    await open();
    const box = screen.getByLabelText(t('referral.message.label')) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: 'abc' } });
    expect(screen.getByText(t('referral.message.charCount', { count: 3 }))).toBeTruthy();
    expect(localStorage.getItem('remoa:referral-message')).toBe('abc');
    expect(track).toHaveBeenCalledWith('referral_message_edited', {});
    fireEvent.click(screen.getByRole('button', { name: t('referral.message.restore') }));
    expect(box.value).toBe(t('referral.message.default', { link: referralSummaryFixtures.inProgress.link }));
    expect(localStorage.getItem('remoa:referral-message')).toBeNull();
  });

  it('convite por e-mail: valida, envia pela API, mostra confirmação e limpa os chips', async () => {
    await open();
    const input = screen.getByLabelText(t('referral.page.emailLabel'));
    fireEvent.change(input, { target: { value: 'errado' } });
    fireEvent.click(screen.getByRole('button', { name: t('referral.emailInvite.add') }));
    expect(screen.getByText(t('referral.emailInvite.errors.invalid'))).toBeTruthy();
    for (const e of ['a@x.com', 'b@y.com']) {
      fireEvent.change(input, { target: { value: e } });
      fireEvent.click(screen.getByRole('button', { name: t('referral.emailInvite.add') }));
    }
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: t('referral.emailInvite.sendMany', { count: 2 }) })); });
    expect(apiMock).toHaveBeenCalledWith('/v1/referral/invites', expect.objectContaining({ method: 'POST', body: JSON.stringify({ emails: ['a@x.com', 'b@y.com'] }) }));
    expect(track).toHaveBeenCalledWith('referral_invites_sent', { count: 2 });
    expect(await screen.findByText(t('referral.page.invitesSentMany', { count: 2 }))).toBeTruthy();
    expect(screen.queryByText('a@x.com')).toBeNull();
  });

  it('limite diário: a API recusa e o campo trava com o aviso', async () => {
    await open();
    apiMock.mockImplementation(async (path: string) => (path === '/v1/referral/invites' ? { ok: false, error: { code: 'rate_limited', message: 'invite_daily_limit' } } : { ok: true, data: clone(current) }) as never);
    fireEvent.change(screen.getByLabelText(t('referral.page.emailLabel')), { target: { value: 'a@x.com' } });
    fireEvent.click(screen.getByRole('button', { name: t('referral.emailInvite.add') }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: t('referral.emailInvite.send', { count: 1 }) })); });
    expect((await screen.findByRole('alert')).textContent).toContain(t('referral.emailInvite.limitReached'));
    expect((screen.getByLabelText(t('referral.page.emailLabel')) as HTMLInputElement).disabled).toBe(true);
  });

  it('erro de envio mostra "Tentar de novo"', async () => {
    await open();
    apiMock.mockImplementation(async (path: string) => { if (path === '/v1/referral/invites') throw new Error('offline'); return { ok: true, data: clone(current) } as never; });
    fireEvent.change(screen.getByLabelText(t('referral.page.emailLabel')), { target: { value: 'a@x.com' } });
    fireEvent.click(screen.getByRole('button', { name: t('referral.emailInvite.add') }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: t('referral.emailInvite.send', { count: 1 }) })); });
    expect(await screen.findByRole('button', { name: t('referral.page.retry') })).toBeTruthy();
  });

  it('selecionar na lista e no mapa é a mesma ação', async () => {
    await open();
    const list = screen.getByRole('list', { name: t('referral.friends.label') });
    const rows = within(list).getAllByRole('button');
    fireEvent.click(rows[0]!);
    expect(rows[0]!.getAttribute('aria-pressed')).toBe('true');
    expect(track).toHaveBeenCalledWith('referral_friend_selected', { status: 'qualified' });
    const nodes = document.querySelectorAll('[data-testid="referral-map"] button');
    fireEvent.click(nodes[1]!);
    expect(rows[1]!.getAttribute('aria-pressed')).toBe('true');
    expect(rows[0]!.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('region', { name: 'Marina C.' })).toBeTruthy();
  });

  it('vazio: explica na lista e oferece 3 nós "Convidar"', async () => {
    await open(referralSummaryFixtures.empty);
    expect(screen.getByText(t('referral.friends.noFriends'))).toBeTruthy();
    expect(screen.getAllByRole('link', { name: t('referral.map.inviteLabel') })).toHaveLength(3);
    expect(screen.getByText(t('referral.reward.emptyState'))).toBeTruthy();
  });

  it('erro ao carregar: aviso com "Tentar de novo" que consulta de novo', async () => {
    apiMock.mockRejectedValue(new Error('offline'));
    render(<ReferralProvider><ReferralView /></ReferralProvider>);
    const retry = await screen.findByRole('button', { name: t('referral.page.retry') });
    current = referralSummaryFixtures.inProgress;
    serve();
    fireEvent.click(retry);
    expect(await screen.findByRole('heading', { name: t('referral.link.title') })).toBeTruthy();
  });

  it('consulta a cada 30 s e avisa quando uma indicação vira primeiro mapa', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    current = referralSummaryFixtures.inProgress;
    serve();
    render(<ReferralProvider><ReferralView /></ReferralProvider>);
    await screen.findByRole('heading', { name: t('referral.link.title') });
    expect(screen.queryByText(/criou o primeiro mapa\. Vocês/)).toBeNull();
    const next = clone(current);
    next.friends = next.friends.map((f) => (f.displayName === 'Marina C.' ? { ...f, status: 'qualified' as const } : f));
    next.monthsEarned = 2;
    current = next;
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    const notice = screen.getAllByRole('status').find((n) => n.textContent?.includes('Marina C.'));
    expect(notice?.textContent).toContain(t('referral.reward_moment.notification', { name: 'Marina C.' }));
    expect(track).toHaveBeenCalledWith('referral_reward_seen', {});
    // nova rodada sem mudança não repete o aviso
    vi.mocked(track).mockClear();
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(track).not.toHaveBeenCalledWith('referral_reward_seen', {});
  });

  it('fora da página: consulta a cada 30 s só com referralPending (D-494)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    current = referralSummaryFixtures.inProgress;
    serve();
    render(<ReferralProvider>{null}</ReferralProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(31_000); });
    expect(apiMock).not.toHaveBeenCalled();
    cleanup();
    pending = true;
    render(<ReferralProvider>{null}</ReferralProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(31_000); });
    expect(apiMock.mock.calls.filter(([p]) => p === '/v1/referral/summary').length).toBeGreaterThanOrEqual(2);
  });
});
