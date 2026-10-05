import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { couponFundadorFixture, priceBookFixture } from '@remoa/contracts/mocks';
import { formatBRL as brl } from '@remoa/contracts';
const formatBRL = (c: number) => brl(c).replace(/\u00a0/g, ' ');
import { PlansProvider } from '../plans-context';
import { CheckoutSummary } from './checkout-summary';

const api = vi.fn();
const track = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
const assign = vi.fn();
Object.defineProperty(window, 'location', { value: { assign }, writable: true });

const renderIt = (period: 'monthly' | 'annual' | 'lifetime' = 'monthly') =>
  render(
    <PlansProvider initial={{ priceBook: priceBookFixture, entitlements: null, subscription: null, period }}>
      <CheckoutSummary />
    </PlansProvider>,
  );
const subscribeBtn = () => screen.getByRole('button', { name: 'Assinar o Pro' });
const applyCode = async (code: string) => {
  fireEvent.click(screen.getByRole('button', { name: /código de fundador/i }));
  fireEvent.change(screen.getByLabelText('Código de fundador'), { target: { value: code } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Aplicar' })); });
};

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

describe('CheckoutSummary Founder', () => {
  it('lifetime: one-time price, no coupon or next charge, posts period lifetime without a coupon', async () => {
    api.mockResolvedValue({ ok: true, data: { url: 'https://stripe.test/x' } });
    renderIt('lifetime');
    expect(screen.getAllByText(formatBRL(priceBookFixture.lifetime.amount)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Próxima cobrança/)).toBeNull();
    expect(screen.queryByRole('button', { name: /código de fundador/i })).toBeNull();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Comprar o Founder' })); });
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    expect(api).toHaveBeenCalledWith('/v1/billing/checkout', { method: 'POST', body: JSON.stringify({ period: 'lifetime', method: 'pix' }) });
    expect(track).toHaveBeenCalledWith('checkout_started', { period: 'lifetime', method: 'pix', coupon: false });
    expect(assign).toHaveBeenCalledWith('https://stripe.test/x');
  });
});

describe('CheckoutSummary', () => {
  it('shows the monthly price and next charge from the server', () => {
    renderIt();
    expect(screen.getAllByText(formatBRL(priceBookFixture.monthly.amount)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Próxima cobrança em/)).toBeVisible();
    expect(screen.queryByText(/Economize/)).toBeNull();
  });

  it('annual shows monthly equivalent and yearly saving', () => {
    renderIt('annual');
    expect(screen.getByText(/Equivale a/)).toBeVisible();
    expect(screen.getByText(/Economize/, { selector: '[torph-sr]' })).toBeInTheDocument();
  });

  it('method choice tracks and explains Pix', () => {
    renderIt();
    expect(screen.getByText(/Ele não renova sozinho/)).toBeVisible();
    fireEvent.click(screen.getByRole('radio', { name: /Cartão/ }));
    expect(track).toHaveBeenCalledWith('plans_method_selected', { method: 'card' });
    expect(screen.queryByText(/Ele não renova sozinho/)).toBeNull();
  });

  it('valid coupon: server-validated, totals show struck list price and founder total', async () => {
    api.mockResolvedValue({ ok: true, data: couponFundadorFixture });
    renderIt();
    await applyCode('fundador');
    expect(api).toHaveBeenCalledWith('/v1/billing/coupon', { method: 'POST', body: JSON.stringify({ code: 'fundador' }) });
    expect(track).toHaveBeenCalledWith('coupon_applied', {});
    expect(screen.getByText('Preço de fundador aplicado')).toBeVisible();
    expect(screen.getByText(/Preço de tabela/)).toBeInTheDocument();
    expect(screen.getByText('Total hoje', { selector: '[torph-sr]' }).closest('.justify-between')).toHaveTextContent(formatBRL(2900));
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));
    expect(screen.queryByText('Preço de fundador aplicado')).toBeNull();
  });

  it.each([
    ['invalid', { ok: true, data: { valid: false } }],
    ['rate limited', { ok: false, error: { code: 'rate_limited', message: 'x' } }],
  ])('%s coupon: error and coupon_failed without the code', async (_n, res) => {
    api.mockResolvedValue(res);
    renderIt();
    await applyCode('SECRETO');
    expect(screen.getByRole('alert')).toHaveTextContent('Código não reconhecido');
    expect(track).toHaveBeenCalledWith('coupon_failed', {});
    expect(JSON.stringify(track.mock.calls)).not.toContain('SECRETO');
  });

  it('keeps the overlay at least 600 ms, then redirects; double click makes one call', async () => {
    api.mockResolvedValue({ ok: true, data: { url: 'https://stripe/x' } });
    renderIt('annual');
    fireEvent.click(subscribeBtn());
    fireEvent.click(subscribeBtn());
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText('Abrindo o pagamento seguro')).toBeVisible();
    expect(api).toHaveBeenCalledTimes(1);
    expect(api).toHaveBeenCalledWith('/v1/billing/checkout', { method: 'POST', body: JSON.stringify({ period: 'annual', method: 'pix' }) });
    expect(track).toHaveBeenCalledWith('checkout_started', { period: 'annual', method: 'pix', coupon: false });
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(assign).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(150); });
    expect(assign).toHaveBeenCalledWith('https://stripe/x');
    expect(track).toHaveBeenCalledWith('checkout_redirected', { period: 'annual', method: 'pix' });
  });

  it('sends the coupon code to checkout, flagging coupon: true', async () => {
    api.mockResolvedValueOnce({ ok: true, data: couponFundadorFixture }).mockResolvedValue({ ok: true, data: { url: 'u' } });
    renderIt();
    await applyCode('FUNDADOR');
    fireEvent.click(subscribeBtn());
    await act(async () => { vi.advanceTimersByTime(700); });
    expect(api).toHaveBeenLastCalledWith('/v1/billing/checkout', { method: 'POST', body: JSON.stringify({ period: 'monthly', method: 'pix', couponCode: 'FUNDADOR' }) });
    expect(track).toHaveBeenCalledWith('checkout_started', { period: 'monthly', method: 'pix', coupon: true });
  });

  it('failure re-enables the button, shows retry, and leaves the overlay', async () => {
    api.mockResolvedValueOnce({ ok: false, error: { code: 'internal', message: 'x' } }).mockResolvedValue({ ok: true, data: { url: 'u2' } });
    renderIt();
    fireEvent.click(subscribeBtn());
    await act(async () => { vi.advanceTimersByTime(700); });
    expect(screen.queryByText('Abrindo o pagamento seguro')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('Não conseguimos abrir o pagamento');
    expect(subscribeBtn()).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await act(async () => { vi.advanceTimersByTime(700); });
    expect(assign).toHaveBeenCalledWith('u2');
  });

  it('back from Stripe (bfcache restore) drops the overlay and unlocks the button', async () => {
    api.mockResolvedValue({ ok: true, data: { url: 'https://stripe/x' } });
    renderIt();
    fireEvent.click(subscribeBtn());
    await act(async () => { vi.advanceTimersByTime(700); });
    expect(assign).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Abrindo o pagamento seguro')).toBeVisible();
    const restore = new Event('pageshow') as PageTransitionEvent;
    Object.defineProperty(restore, 'persisted', { value: true });
    act(() => { window.dispatchEvent(restore); });
    expect(screen.queryByText('Abrindo o pagamento seguro')).toBeNull();
    fireEvent.click(subscribeBtn());
    await act(async () => { vi.advanceTimersByTime(700); });
    expect(assign).toHaveBeenCalledTimes(2);
  });

  it('offline: button disabled with a warning', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    renderIt();
    expect(subscribeBtn()).toBeDisabled();
    expect(screen.getByText('Sem conexão. Reconecte para assinar.')).toBeVisible();
  });
});
