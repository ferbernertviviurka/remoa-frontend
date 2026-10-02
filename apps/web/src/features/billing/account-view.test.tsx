import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Entitlements } from '@remoa/contracts';
import { PLAN_LIMITS } from '@remoa/contracts';
import { ToastProvider } from '@remoa/ui';
import { AccountView } from './account-view';

const push = vi.fn();
const replace = vi.fn();
const api = vi.fn();
const track = vi.fn();
const signOut = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace, refresh: vi.fn() }) }));
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
vi.mock('@/server/auth/actions', () => ({ signOut: () => signOut() }));
const assign = vi.fn();
Object.defineProperty(window, 'location', { value: { assign }, writable: true });
URL.createObjectURL = vi.fn(() => 'blob:x');
URL.revokeObjectURL = vi.fn();

const free: Entitlements = { plan: 'free', status: null, ...PLAN_LIMITS.free, usage: { ai_grades: 5, ai_generations: 0, boards: 2, cards: 40 }, renewsAt: null, cancelAtPeriodEnd: false, graceUntil: null };
const pro: Entitlements = { ...free, plan: 'pro', status: 'active', ...PLAN_LIMITS.pro, renewsAt: new Date('2026-11-15T12:00:00Z'), usage: { ai_grades: 80, ai_generations: 2, boards: 9, cards: 900 } };
const view = (ent: Entitlements, notice?: 'checkout' | 'portal') =>
  render(
    <ToastProvider closeLabel="Fechar" viewportLabel="Avisos">
      <AccountView email="a@b.co" ent={ent} notice={notice} />
    </ToastProvider>,
  );
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AccountView', () => {
  it('free: plan, usage vs limits and the subscribe CTA only', () => {
    view(free);
    expect(screen.getByText('Free')).toBeVisible();
    expect(screen.getByText(`2 de ${PLAN_LIMITS.free.limits.boards}`)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Cancelar assinatura' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Assinar o Pro' }));
    expect(push).toHaveBeenCalledWith('/precos');
  });

  it('pro: next charge, unlimited usage, manage and cancel open the portal', async () => {
    api.mockResolvedValue({ ok: true, data: { url: 'http://portal/x' } });
    view(pro);
    expect(screen.getByText(/Próxima cobrança em 15 de novembro de 2026/)).toBeVisible();
    expect(screen.getByText('80 (sem limite)')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Gerenciar pagamento' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('http://portal/x'));
    expect(api).toHaveBeenLastCalledWith('/v1/billing/portal', { method: 'POST', body: '{}' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar assinatura' }));
    await waitFor(() => expect(api).toHaveBeenLastCalledWith('/v1/billing/portal', { method: 'POST', body: '{"cancel":true}' }));
  });

  it('cancelAtPeriodEnd (card canceled or Pix prepaid): shows the end date, no renewal, no cancel button', () => {
    view({ ...pro, cancelAtPeriodEnd: true });
    expect(screen.getByText(/ativo até 15 de novembro de 2026 e não renova/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Cancelar assinatura' })).toBeNull();
  });

  it('grace: warns until graceUntil', () => {
    view({ ...pro, status: 'past_due', graceUntil: new Date('2026-11-22T12:00:00Z') });
    expect(screen.getByText(/continua ativo até 22 de novembro de 2026/)).toBeVisible();
  });

  it('?checkout=ok toasts, tracks subscription_started once and clears the URL', () => {
    view(pro, 'checkout');
    expect(screen.getByText('Assinatura ativada. Bem-vindo ao Pro.')).toBeVisible();
    expect(track).toHaveBeenCalledWith('subscription_started', {});
    expect(replace).toHaveBeenCalledWith('/conta');
  });

  it('exports the data as a JSON download and tracks account_exported', async () => {
    api.mockResolvedValue({ ok: true, data: { version: 1 } });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    view(free);
    fireEvent.click(screen.getByRole('button', { name: 'Exportar meus dados' }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(api).toHaveBeenCalledWith('/v1/account/export', { method: 'POST' });
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0]![0] as Blob;
    expect(blob.type).toBe('application/json');
    expect(track).toHaveBeenCalledWith('account_exported', {});
  });

  it('delete needs confirmation, states the 7 days, then signs out and leaves', async () => {
    api.mockResolvedValue({ ok: true, data: { hardDeleteAt: '2026-10-09T00:00:00Z' } });
    signOut.mockResolvedValue({ ok: true });
    view(free);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir conta' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('7 dias');
    expect(api).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir minha conta' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
    expect(api).toHaveBeenCalledWith('/v1/account', { method: 'DELETE' });
    expect(signOut).toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith('account_deleted', {});
  });

  it('keeps the account and shows an error when the delete fails', async () => {
    api.mockResolvedValue({ ok: false, error: { code: 'internal', message: 'x' } });
    view(free);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir conta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir minha conta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não conseguimos excluir a conta');
    expect(signOut).not.toHaveBeenCalled();
  });
});
