import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { priceBookFixture, subscriptionFixtures } from '@remoa/contracts/mocks';
import type { SubscriptionSummary } from '@remoa/contracts';
import { ToastProvider } from '@remoa/ui';
import { PlansProvider } from '../plans-context';
import { SubscriptionCard } from './subscription-card';

const refresh = vi.fn();
const track = vi.fn();
const api = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));

const view = (subscription: SubscriptionSummary | null) =>
  render(
    <ToastProvider closeLabel="Fechar" viewportLabel="Avisos">
      <PlansProvider initial={{ priceBook: priceBookFixture, entitlements: null, subscription, period: 'monthly' }}>
        <SubscriptionCard />
      </PlansProvider>
    </ToastProvider>,
  );
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const { monthlyActive, pastDue, cancelScheduled } = subscriptionFixtures;

describe('SubscriptionCard', () => {
  it('monthly card: shows savings box and manage', () => {
    view(monthlyActive);
    expect(screen.getByText('No anual você economiza')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Gerenciar assinatura' })).toBeVisible();
  });

  it('annual: no savings box', () => {
    view({ ...monthlyActive, period: 'annual' });
    expect(screen.queryByText('No anual você economiza')).toBeNull();
  });

  it('past due: warns with the grace date', () => {
    view(pastDue);
    expect(screen.getByText(/Pagamento em atraso/)).toBeVisible();
  });

  it('cancel scheduled: ends at date, reactivate via portal, no savings box', async () => {
    api.mockResolvedValue({ ok: true, data: { url: 'https://x.test' } });
    view(cancelScheduled);
    expect(screen.getByText(/Termina em/, { selector: 'dt' })).toBeVisible();
    expect(screen.queryByText('No anual você economiza')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reativar' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/billing/portal', { method: 'POST' }));
  });

  it('pix: period end notice, no upsell, no manage', () => {
    view({ ...monthlyActive, method: 'pix' });
    expect(screen.getByText(/Seu período no Pix termina em/)).toBeVisible();
    expect(screen.queryByText('No anual você economiza')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Gerenciar assinatura' })).toBeNull();
  });

  it('switch-annual switched: toast and refresh', async () => {
    api.mockResolvedValue({ ok: true, data: { kind: 'switched' } });
    view(monthlyActive);
    fireEvent.click(screen.getByRole('button', { name: 'Mudar para o anual' }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(track).toHaveBeenCalledWith('plans_annual_switch_clicked', {});
    expect(screen.getByText('Pronto: você está no plano anual.')).toBeVisible();
  });

  it('switch-annual redirect: goes to the url', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    api.mockResolvedValue({ ok: true, data: { kind: 'redirect', url: 'https://stripe.test/x' } });
    view(monthlyActive);
    fireEvent.click(screen.getByRole('button', { name: 'Mudar para o anual' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://stripe.test/x'));
    expect(refresh).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
