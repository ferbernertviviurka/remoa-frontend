import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PLAN_LIMITS } from '@remoa/contracts';
import { PricingView } from './pricing-view';

const push = vi.fn();
const api = vi.fn();
const track = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
const assign = vi.fn();
Object.defineProperty(window, 'location', { value: { assign }, writable: true });
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PricingView', () => {
  it('renders the plan table from PLAN_LIMITS', () => {
    render(<PricingView loggedIn isPro={false} />);
    const row = (name: string) => within(screen.getByRole('row', { name: new RegExp(name) }));
    expect(row('Mapas').getByText(String(PLAN_LIMITS.free.limits.boards))).toBeVisible();
    expect(row('Mapas').getByText('Ilimitados')).toBeVisible();
    expect(row('Correções por IA').getByText(String(PLAN_LIMITS.free.limits.ai_grades))).toBeVisible();
    expect(row('Geração de mapa').getByText(String(PLAN_LIMITS.pro.limits.ai_generations))).toBeVisible();
  });

  it('sends the chosen period, method and founder coupon, tracks and redirects', async () => {
    api.mockResolvedValue({ ok: true, data: { url: 'http://pay/x' } });
    render(<PricingView loggedIn isPro={false} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Anual' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Cartão' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Tenho o preço de fundador' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assinar o Pro' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('http://pay/x'));
    expect(api).toHaveBeenCalledWith('/v1/billing/checkout', { method: 'POST', body: JSON.stringify({ period: 'annual', method: 'card', coupon: 'FUNDADOR' }) });
    expect(track).toHaveBeenCalledWith('checkout_started', { period: 'annual', method: 'card' });
  });

  it('defaults to monthly Pix without coupon', async () => {
    api.mockResolvedValue({ ok: true, data: { url: 'http://pay/y' } });
    render(<PricingView loggedIn isPro={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Assinar o Pro' }));
    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(api.mock.calls[0]![1].body).toBe(JSON.stringify({ period: 'monthly', method: 'pix' }));
  });

  it('logged-out visitors go to sign-up and come back', () => {
    render(<PricingView loggedIn={false} isPro={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Assinar o Pro' }));
    expect(push).toHaveBeenCalledWith('/cadastro?next=%2Fprecos');
    expect(api).not.toHaveBeenCalled();
  });

  it('shows an error and re-enables the CTA when checkout fails', async () => {
    api.mockResolvedValue({ ok: false, error: { code: 'internal', message: 'x' } });
    render(<PricingView loggedIn isPro={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Assinar o Pro' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não conseguimos abrir o pagamento');
    expect(assign).not.toHaveBeenCalled();
  });

  it('Pro users see a link to the account instead of the checkout', () => {
    render(<PricingView loggedIn isPro />);
    expect(screen.queryByRole('button', { name: 'Assinar o Pro' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver minha conta' }));
    expect(push).toHaveBeenCalledWith('/conta');
  });
});
