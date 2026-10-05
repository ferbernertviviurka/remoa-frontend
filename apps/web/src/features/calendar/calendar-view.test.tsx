import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import * as mocks from '@remoa/contracts/mocks';
import { ToastProvider } from '@remoa/ui';
import { CalendarView } from './calendar-view';

const api = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a), apiBase: () => 'http://api.test' }));

const U = mocks.fixtureUserId;
const NOW = mocks.FIXTURE_NOW.toISOString();

/** Routes the browser client to the contract mocks (same validation as the API). */
async function route(path: string, init?: RequestInit) {
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  const method = init?.method ?? 'GET';
  const url = new URL(path, 'http://x');
  const id = /^\/v1\/calendar\/events\/([^/]+)/.exec(url.pathname)?.[1];
  const lid = /^\/v1\/calendar\/labels\/([^/]+)/.exec(url.pathname)?.[1];
  if (url.pathname === '/v1/calendar/events') return method === 'POST' ? mocks.createCalendarEvent(U, body) : mocks.listCalendarEvents(U, { from: url.searchParams.get('from')!, to: url.searchParams.get('to')! });
  if (id && url.pathname.endsWith('/duplicate')) return mocks.duplicateCalendarEvent(U, id, body);
  if (id && url.pathname.endsWith('/reminders')) return mocks.setCalendarReminders(U, id, body);
  if (id) return method === 'DELETE' ? mocks.deleteCalendarEvent(U, id) : mocks.updateCalendarEvent(U, id, body);
  if (url.pathname === '/v1/calendar/labels') return mocks.listCalendarLabels(U);
  if (lid) return method === 'DELETE' ? mocks.deleteCalendarLabel(U, lid) : mocks.updateCalendarLabel(U, lid, body);
  if (url.pathname === '/v1/calendar/tour-seen') return mocks.markCalendarTourSeen(U);
  if (url.pathname === '/v1/calendar/view') return mocks.setCalendarView(U, body);
  throw new Error(`unexpected ${method} ${path}`);
}
const calls = (needle: string) => api.mock.calls.filter(([p]) => String(p).includes(needle));

async function mount(o: { tourSeen?: boolean } = {}) {
  mocks.resetCalendarMocks({ tourSeen: o.tourSeen ?? true });
  const settings = (await mocks.getCalendarSettings(U)) as { ok: true; data: Parameters<typeof CalendarView>[0]['settings'] };
  const labels = (await mocks.listCalendarLabels(U)) as { ok: true; data: { labels: Parameters<typeof CalendarView>[0]['labels'] } };
  return render(
    <ToastProvider closeLabel="Fechar" viewportLabel="Avisos">
      <CalendarView settings={settings.data} labels={labels.data.labels} nowIso={NOW} />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); // Radix Switch in jsdom
  api.mockImplementation(route);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('tutorial (FR-16)', () => {
  it('opens on the first visit, saves tour-seen on close, and is not shown on the second visit', async () => {
    const first = await mount({ tourSeen: false });
    const dialog = await screen.findByRole('dialog', { name: 'Como o calendário funciona' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Pular' }));
    await waitFor(() => expect(calls('/tour-seen')).toHaveLength(1));
    expect(screen.queryByRole('dialog', { name: 'Como o calendário funciona' })).toBeNull();
    first.unmount();

    await mount({ tourSeen: true });
    await screen.findByRole('grid', { name: 'Calendário do mês' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('reopens from "Como o calendário funciona" without the create step and does not save again', async () => {
    await mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Como o calendário funciona' }));
    const dialog = await screen.findByRole('dialog', { name: 'Como o calendário funciona' });
    for (let i = 0; i < 4; i++) fireEvent.click(within(dialog).getByRole('button', { name: 'Próximo' }));
    expect(within(dialog).queryByRole('button', { name: 'Criar meu primeiro compromisso' })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Entendi' }));
    expect(calls('/tour-seen')).toHaveLength(0);
  });

  it('"Criar meu primeiro compromisso" closes the tour and opens the new-event modal', async () => {
    await mount({ tourSeen: false });
    const dialog = await screen.findByRole('dialog', { name: 'Como o calendário funciona' });
    for (let i = 0; i < 4; i++) fireEvent.click(within(dialog).getByRole('button', { name: 'Próximo' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar meu primeiro compromisso' }));
    expect(await screen.findByRole('dialog', { name: 'Novo compromisso' })).toBeInTheDocument();
    await waitFor(() => expect(calls('/tour-seen')).toHaveLength(1));
  });
});

describe('page', () => {
  it('loads only the visible month ± 1 and shows the events; the saved view is changed through PATCH /view', async () => {
    await mount();
    await screen.findByRole('button', { name: /Prova de Clínica Médica/ });
    expect(calls('/v1/calendar/events?')[0]![0]).toBe('/v1/calendar/events?from=2026-09-01&to=2026-11-30');
    fireEvent.click(screen.getByRole('button', { name: 'Agenda' }));
    await waitFor(() => expect(calls('/v1/calendar/view')).toHaveLength(1));
    expect(JSON.parse(String(calls('/v1/calendar/view')[0]![1].body))).toEqual({ view: 'agenda' });
  });

  it('hides a label from the grid with its switch, and the choice is persisted', async () => {
    await mount();
    await screen.findByRole('button', { name: /Prova de Clínica Médica/ });
    fireEvent.click(screen.getByRole('switch', { name: 'Mostrar Prova' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Prova de Clínica Médica/ })).toBeNull());
    expect(JSON.parse(String(calls('/v1/calendar/labels/')[0]![1].body))).toEqual({ hidden: true });
  });

  it('shows the real reminder times in the drawer and cancels one with its switch', async () => {
    await mount();
    fireEvent.click(await screen.findByRole('button', { name: /Prova de Clínica Médica/ }));
    const drawer = await screen.findByRole('dialog', { name: 'Detalhes do compromisso' });
    expect(within(drawer).getByText(/às 18:00/)).toBeInTheDocument();
    expect(within(drawer).getByText(/às 07:00/)).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('switch', { name: '1 dia antes' }));
    await waitFor(() => expect(calls('/reminders')).toHaveLength(1));
    expect(JSON.parse(String(calls('/reminders')[0]![1].body))).toEqual({ remindD1: false });
  });

  it('creates with the N key: optimistic, opens the details and warns about the e-mails', async () => {
    await mount();
    await screen.findByRole('grid', { name: 'Calendário do mês' });
    fireEvent.keyDown(window, { key: 'n' });
    const modal = await screen.findByRole('dialog', { name: 'Novo compromisso' });
    const save = within(modal).getByRole('button', { name: 'Salvar compromisso' });
    expect(save).toBeDisabled();
    fireEvent.change(within(modal).getByLabelText('Título'), { target: { value: 'Prova de Cirurgia' } });
    fireEvent.click(save);
    expect(await screen.findByText('Compromisso salvo. Avisamos por e-mail 1 dia antes e no dia.')).toBeInTheDocument();
    const drawer = await screen.findByRole('dialog', { name: 'Detalhes do compromisso' });
    expect(within(drawer).getByText('Prova de Cirurgia')).toBeInTheDocument();
    await waitFor(() => expect(calls('/v1/calendar/events').some(([, i]) => i?.method === 'POST')).toBe(true));
    expect(JSON.parse(String(calls('/v1/calendar/events').find(([, i]) => i?.method === 'POST')![1].body))).toMatchObject({ title: 'Prova de Cirurgia', date: '2026-10-01', allDay: false });
  });

  it('opens the new-event modal with the clicked day filled in', async () => {
    await mount();
    fireEvent.click(await screen.findByRole('gridcell', { name: /quinta, 8 de outubro/ }));
    const modal = await screen.findByRole('dialog', { name: 'Novo compromisso' });
    expect(within(modal).getByLabelText('Data')).toHaveValue('2026-10-08');
  });

  it('deletes only after confirmation', async () => {
    await mount();
    fireEvent.click(await screen.findByRole('button', { name: /Plantão no pronto-socorro/ }));
    const drawer = await screen.findByRole('dialog', { name: 'Detalhes do compromisso' });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Excluir' }));
    expect(within(drawer).getByText('Os avisos agendados também serão cancelados.')).toBeInTheDocument();
    expect(calls('DELETE')).toHaveLength(0);
    fireEvent.click(within(drawer).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Plantão no pronto-socorro/ })).toBeNull());
    await waitFor(() => expect(calls('/v1/calendar/events/').some(([, i]) => i?.method === 'DELETE')).toBe(true));
  });

  it('shows the error with "Tentar de novo" when saving fails, and retries', async () => {
    await mount();
    await screen.findByRole('grid', { name: 'Calendário do mês' });
    api.mockImplementation(async (p: string, i?: RequestInit) => (i?.method === 'POST' && p === '/v1/calendar/events' ? { ok: false, error: { code: 'internal', message: 'x' } } : route(p, i)));
    fireEvent.keyDown(window, { key: 'n' });
    const modal = await screen.findByRole('dialog', { name: 'Novo compromisso' });
    fireEvent.change(within(modal).getByLabelText('Título'), { target: { value: 'Simulado' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Salvar compromisso' }));
    const alert = await screen.findByText('Não foi possível salvar. Seu compromisso não foi perdido.');
    api.mockImplementation(route);
    fireEvent.click(within(alert.parentElement!).getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(screen.queryByText('Não foi possível salvar. Seu compromisso não foi perdido.')).toBeNull());
  });

  it('keeps the write and warns when the network is down, replaying it when back online', async () => {
    await mount();
    await screen.findByRole('grid', { name: 'Calendário do mês' });
    api.mockImplementation(async (p: string, i?: RequestInit) => {
      if (i?.method === 'POST' && p === '/v1/calendar/events') throw new Error('offline');
      return route(p, i);
    });
    fireEvent.keyDown(window, { key: 'n' });
    const modal = await screen.findByRole('dialog', { name: 'Novo compromisso' });
    fireEvent.change(within(modal).getByLabelText('Título'), { target: { value: 'Simulado' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Salvar compromisso' }));
    expect(await screen.findByText('Sem conexão. Salvamos o compromisso quando você voltar.')).toBeInTheDocument();
    api.mockImplementation(route);
    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(screen.queryByText('Sem conexão. Salvamos o compromisso quando você voltar.')).toBeNull());
  });
});
