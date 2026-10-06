import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { pushNotificationMock, resetNotificationMocks, notificationFixtures, FIXTURE_NOW } from '@remoa/contracts/mocks';
import { ToastProvider } from '@remoa/ui';
import { apiMock } from './test-utils';
import { NotificationsProvider, POLL_MS } from './provider';
import { NotificationBell } from './bell/notification-bell';
import { NotificationsPage } from './page/notifications-page';
import { groupViews, textOf, whenOf } from './view';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/app/hoje' }));
vi.mock('@/lib/api', () => ({ api: (...a: Parameters<typeof apiMock>) => apiMock(...a) }));
type Handler = (p: { eventType: string; new: Record<string, unknown> }) => void;
let realtime: Handler | null = null;
let status: ((s: string) => void) | undefined;
const getUser = vi.fn(async () => ({ data: { user: { id: 'u1' } } }));
const getSession = vi.fn(async () => ({ data: { session: { access_token: 'jwt-1' } } }));
const setAuth = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser, getSession },
    realtime: { setAuth },
    channel: () => ({ on: (_e: string, _f: unknown, h: Handler) => ((realtime = h), { subscribe: (cb?: (s: string) => void) => (status = cb, {}) }) }),
    removeChannel: () => undefined,
  }),
}));

/** a modal popover hides the bell from the accessibility tree (aria-hidden), so read its label from the DOM */
const bellLabel = () => document.querySelector('[data-testid="bell-icon"]')?.closest('button')?.getAttribute('aria-label');
const TZ = 'America/Sao_Paulo';
const wrap = (ui: React.ReactNode) => render(<ToastProvider closeLabel="Fechar" viewportLabel="Avisos"><NotificationsProvider timezone={TZ} userId="u1">{ui}</NotificationsProvider></ToastProvider>);

beforeEach(() => {
  resetNotificationMocks();
  realtime = null;
  status = undefined;
  window.__remoaEvents = [];
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setInterval', 'clearInterval', 'Date'] });
  vi.setSystemTime(FIXTURE_NOW);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

describe('view', () => {
  it('groups by calendar day in the profile time zone', () => {
    const g = groupViews(notificationFixtures, TZ, FIXTURE_NOW);
    expect(g.map((x) => [x.label, x.items.length]).slice(0, 2)).toEqual([['Hoje', 2], ['Ontem', 1]]);
    expect(g[0]!.items[1]!.title).toBe('18 cards esperam por você hoje');
  });
  it('words relative time', () => {
    expect(whenOf(new Date(FIXTURE_NOW.getTime() - 2 * 3_600_000), FIXTURE_NOW, TZ)).toBe('há 2 h');
  });
  it('words the trial ending notice (D-1213): 3 days before and on the last day', () => {
    const endsAt = FIXTURE_NOW.toISOString();
    expect(textOf({ type: 'trial_ending', data: { endsAt, last: false } }, TZ).title).toBe('Seu teste do Pro termina em 3 dias');
    expect(textOf({ type: 'trial_ending', data: { endsAt, last: true } }, TZ)).toEqual({
      title: 'Seu teste do Pro termina hoje',
      body: 'Depois, sua conta volta para o Grátis sem perder nada. Assine para seguir sem limites.',
    });
  });
});

describe('bell + popover', () => {
  it('shows the unread badge in the label and marks one as read', async () => {
    wrap(<NotificationBell />);
    const bell = await screen.findByRole('button', { name: 'Notificações, 3 não lidas' });
    fireEvent.click(bell);
    const dialog = await screen.findByRole('dialog', { name: 'Central de notificações' });
    const item = await within(dialog).findByText('Seu mapa Insuficiência cardíaca está pronto');
    expect(item).toBeInTheDocument();
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Marcar como lida' })[0]!);
    await waitFor(() => expect(bellLabel()).toBe('Notificações, 2 não lidas'));
    expect(window.__remoaEvents?.map((e) => e.event)).toContain('notif_marked_read');
  });

  it('mark all clears the badge', async () => {
    wrap(<NotificationBell />);
    fireEvent.click(await screen.findByRole('button', { name: 'Notificações, 3 não lidas' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar tudo como lido' }));
    await waitFor(() => expect(bellLabel()).toBe('Notificações'));
  });

  it('opening an item marks it read and navigates client-side, closing the popover', async () => {
    wrap(<NotificationBell />);
    fireEvent.click(await screen.findByRole('button', { name: 'Notificações, 3 não lidas' }));
    const link = (await screen.findByText('18 cards esperam por você hoje')).closest('a')!;
    fireEvent.click(link);
    expect(push).toHaveBeenCalledWith('/app/revisar');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await screen.findByRole('button', { name: 'Notificações, 2 não lidas' });
  });

  it('shows the error row with retry', async () => {
    apiMock.mockImplementationOnce(async () => ({ ok: true as const, data: { total: 0, byCategory: {} } }) as never); // unread-count
    apiMock.mockImplementationOnce(async () => ({ ok: false as const, error: { code: 'internal' as const, message: 'x' } }) as never); // list
    wrap(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: /Notificações/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }));
    await screen.findByText('Seu mapa Insuficiência cardíaca está pronto');
  });

  it('Realtime: refreshes the badge once, announces politely, no duplicate rows', async () => {
    wrap(<NotificationBell />);
    fireEvent.click(await screen.findByRole('button', { name: 'Notificações, 3 não lidas' }));
    await screen.findByText('18 cards esperam por você hoje');
    pushNotificationMock({ id: '00000000-0000-4000-8000-000000009999', type: 'purchase', category: 'account_billing', href: '/app/conta/plano', groupKey: null, createdAt: FIXTURE_NOW, readAt: null, data: { planName: 'Remoa Pro', orderId: 'o' } });
    await waitFor(() => expect(realtime).not.toBeNull());
    act(() => realtime!({ eventType: 'INSERT', new: { type: 'purchase', data: { planName: 'Remoa Pro', orderId: 'o' } } }));
    await waitFor(() => expect(bellLabel()).toBe('Notificações, 4 não lidas')); // the modal popover hides the page behind it
    expect(screen.getByRole('status', { hidden: true })).toHaveTextContent('Nova notificação: Pagamento confirmado');
    expect(await screen.findAllByText('Pagamento confirmado')).toHaveLength(2); // the fixture's old purchase + the new one, not 3
  });

  it('polls unread-count every 60 s without a connection', async () => {
    wrap(<NotificationBell />);
    await screen.findByRole('button', { name: 'Notificações, 3 não lidas' });
    pushNotificationMock({ id: '00000000-0000-4000-8000-000000009998', type: 'review_reminder', category: 'review', href: '/app/revisar', groupKey: null, createdAt: FIXTURE_NOW, readAt: null, data: { cards: 3 } });
    await act(async () => { vi.advanceTimersByTime(POLL_MS); });
    await screen.findByRole('button', { name: 'Notificações, 4 não lidas' });
  });
});

describe('Realtime x poll (P-442)', () => {
  it('never asks the browser Auth for the user (the id comes from the server)', async () => {
    wrap(<NotificationBell />);
    await screen.findByRole('button', { name: 'Notificações, 3 não lidas' });
    await waitFor(() => expect(realtime).not.toBeNull());
    expect(getUser).not.toHaveBeenCalled();
  });
  it('puts the session JWT on the Realtime socket before joining (otherwise RLS drops every event)', async () => {
    wrap(<NotificationBell />);
    await waitFor(() => expect(realtime).not.toBeNull());
    expect(setAuth).toHaveBeenCalledWith('jwt-1');
  });
  it('without a session it never joins as anon (Realtime: "invalid column for filter user_id"), the poll covers it', async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } } as never);
    wrap(<NotificationBell />);
    await screen.findByRole('button', { name: 'Notificações, 3 não lidas' });
    await act(async () => { await Promise.resolve(); });
    expect(realtime).toBeNull();
    expect(setAuth).not.toHaveBeenCalled();
  });
  it('does not poll while the channel is connected, polls again when it drops', async () => {
    wrap(<NotificationBell />);
    await screen.findByRole('button', { name: 'Notificações, 3 não lidas' });
    await waitFor(() => expect(status).toBeDefined());
    act(() => status!('SUBSCRIBED'));
    pushNotificationMock({ id: '00000000-0000-4000-8000-000000009997', type: 'review_reminder', category: 'review', href: '/app/revisar', groupKey: null, createdAt: FIXTURE_NOW, readAt: null, data: { cards: 3 } });
    await act(async () => { vi.advanceTimersByTime(POLL_MS * 2); });
    expect(bellLabel()).toBe('Notificações, 3 não lidas');
    act(() => status!('CHANNEL_ERROR'));
    await act(async () => { vi.advanceTimersByTime(POLL_MS); });
    await screen.findByRole('button', { name: 'Notificações, 4 não lidas' });
  });
});

describe('page', () => {
  it('filters by category chip and removes an item for good', async () => {
    wrap(<NotificationsPage />);
    await screen.findByText('Seu mapa Insuficiência cardíaca está pronto');
    fireEvent.click(screen.getByRole('button', { name: /Mapas/ }));
    await waitFor(() => expect(screen.queryByText('18 cards esperam por você hoje')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Remover notificação' }));
    await waitFor(() => expect(screen.queryByText('Seu mapa Insuficiência cardíaca está pronto')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: /Todas/ }));
    await screen.findByText('18 cards esperam por você hoje');
    expect(screen.queryByText('Seu mapa Insuficiência cardíaca está pronto')).toBeNull();
  });

  it('"Só não lidas" hides read items', async () => {
    wrap(<NotificationsPage />);
    await screen.findByText('Pagamento confirmado');
    fireEvent.click(screen.getByRole('switch', { name: 'Só não lidas' }));
    await waitFor(() => expect(screen.queryByText('Pagamento confirmado')).toBeNull());
  });
});

describe('preferences panel', () => {
  it('saves at once, locks fixed rows and dims reminder rows when paused', async () => {
    wrap(<NotificationsPage />);
    const pause = await screen.findByRole('switch', { name: /Pausar e-mails de lembrete/ });
    const email = screen.getByRole('switch', { name: 'Compromissos: 1 dia antes por e-mail' });
    expect(email).toBeChecked();
    fireEvent.click(email);
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Compromissos: 1 dia antes por e-mail' })).not.toBeChecked());
    await screen.findByText('Preferência salva.');
    fireEvent.click(pause);
    await waitFor(() => expect(pause).toBeChecked());
    fireEvent.click(screen.getByRole('button', { name: '07:00' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '07:00' })).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.queryByRole('switch', { name: 'Suporte por e-mail' })).toBeNull(); // locked: no switch
    expect(window.__remoaEvents?.map((e) => e.event)).toEqual(expect.arrayContaining(['notif_pref_changed', 'notif_pause_toggled']));
  });

  it('reverts and tells the user when saving fails', async () => {
    wrap(<NotificationsPage />);
    const sw = await screen.findByRole('switch', { name: 'Mapa pronto no app' });
    apiMock.mockImplementationOnce(async () => ({ ok: false as const, error: { code: 'internal' as const, message: 'x' } }) as never);
    fireEvent.click(sw);
    await screen.findByText('Não foi possível salvar. Tente de novo.');
    expect(screen.getByRole('switch', { name: 'Mapa pronto no app' })).toBeChecked();
  });
});
