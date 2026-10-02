import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { SuccessView, POLL_MAX_MS } from './success-view';

const push = vi.fn();
const replace = vi.fn();
const refresh = vi.fn();
const track = vi.fn();
const api = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace, refresh }) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
const entRefresh = vi.fn();
vi.mock('@/features/shell/entitlements', () => ({ useEntitlements: () => ({ refresh: entRefresh }) }));

const pending = { ok: true, data: { status: 'pending_pix' } };
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('SuccessView', () => {
  it('paid: shows success and refreshes navbar and entitlements', () => {
    render(<SuccessView sessionId="cs_1" initial="paid" />);
    expect(screen.getAllByText('Você agora é Pro.').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Ir para Hoje' })).toBeVisible();
    expect(refresh).toHaveBeenCalled();
    expect(entRefresh).toHaveBeenCalled();
  });

  it('pending_pix: waits without showing Pro, polls, then shows success when paid', async () => {
    api.mockResolvedValueOnce(pending).mockResolvedValueOnce({ ok: true, data: { status: 'paid' } });
    render(<SuccessView sessionId="cs_1" initial="pending_pix" />);
    expect(track).toHaveBeenCalledWith('checkout_pending_pix', {});
    expect(screen.getByText('Estamos aguardando a confirmação do Pix')).toBeVisible();
    expect(screen.queryByText('Você agora é Pro.')).toBeNull();
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(screen.queryByText('Você agora é Pro.')).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(api).toHaveBeenCalledWith('/v1/billing/checkout/cs_1');
    expect(screen.getAllByText('Você agora é Pro.').length).toBeGreaterThan(0);
  });

  it('pending_pix: times out after 2 min', async () => {
    api.mockResolvedValue(pending);
    render(<SuccessView sessionId="cs_1" initial="pending_pix" />);
    await act(() => vi.advanceTimersByTimeAsync(POLL_MAX_MS + 3000));
    expect(screen.getByText(/demorando mais que o normal/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ver meus planos' })).toBeVisible();
    expect(screen.queryByText('Você agora é Pro.')).toBeNull();
  });
});
