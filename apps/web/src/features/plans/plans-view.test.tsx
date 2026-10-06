import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { accountFreeFixture, accountProFixture, priceBookFixture, subscriptionFixtures } from '@remoa/contracts/mocks';
import { annualDiscountPercent, type Entitlements } from '@remoa/contracts';
import { ToastProvider } from '@remoa/ui';
import { PlansProvider } from './plans-context';
import { PlansView, parseFrom } from './plans-view';

const replace = vi.fn();
const push = vi.fn();
const track = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace, refresh: vi.fn() }) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));

const free = accountFreeFixture.entitlements;
const pro = accountProFixture.entitlements;
const withUsage = (e: Entitlements, usage: Partial<Entitlements['usage']>): Entitlements => ({ ...e, usage: { ...e.usage, ...usage } });

function view(opts: { ent?: Entitlements | null; period?: 'monthly' | 'annual'; from?: string; canceled?: boolean } = {}) {
  const ent = opts.ent === undefined ? free : opts.ent;
  return render(
    <ToastProvider closeLabel="Fechar" viewportLabel="Avisos">
      <PlansProvider initial={{ priceBook: priceBookFixture, entitlements: ent, subscription: ent?.plan === 'pro' ? subscriptionFixtures.monthlyActive : null, period: opts.period ?? 'monthly' }}>
        <PlansView from={opts.from} canceled={opts.canceled ?? false} />
      </PlansProvider>
    </ToastProvider>,
  );
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PlansView', () => {
  it('Free: the referral strip goes to /app/indicar?de=plans; Pro has none', () => {
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Indique e ganhe' }));
    expect(push).toHaveBeenCalledWith('/app/indicar?de=plans');
    cleanup();
    view({ ent: pro });
    expect(screen.queryByText('Prefere ganhar o Pro?')).toBeNull();
  });


  it('Free: title, period toggle with the computed discount label, tracking plans_viewed', () => {
    view({ from: 'navbar_upgrade' });
    expect(screen.getByRole('heading', { level: 1, name: 'Seu estudo pede mais espaço?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(`Anual.*-${annualDiscountPercent(priceBookFixture)}%`) })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('plans_viewed', { from: 'navbar_upgrade' });
  });

  it('Free: Founder offer swaps the summary to the one-time purchase and back', () => {
    view();
    expect(screen.getByRole('heading', { name: /Founder/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quero ser Founder' }));
    expect(track).toHaveBeenCalledWith('plans_period_changed', { period: 'lifetime' });
    expect(screen.getByRole('button', { name: 'Comprar o Founder' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mensal/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Prefiro o Pro' }));
    expect(screen.getByRole('button', { name: 'Assinar o Pro' })).toBeInTheDocument();
  });

  it('Founder: lifetime state, no offer, no toggle, no matrix, no renewal or manage actions', () => {
    view({ ent: { ...pro, plan: 'founder', renewsAt: null, limits: { ...pro.limits, ai_generations: null } } });
    expect(screen.getByRole('heading', { level: 1, name: 'Você é Founder.' })).toBeInTheDocument();
    expect(screen.getByText('Vitalício')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quero ser Founder' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Mensal/ })).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByText(/Renova em/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Gerenciar/ })).toBeNull();
  });

  it('unknown ?de= becomes direct', () => {
    expect(parseFrom('evil')).toBe('direct');
    expect(parseFrom(undefined)).toBe('direct');
    expect(parseFrom('boards')).toBe('boards');
  });

  it('Pro: title, no toggle, current plan chip on Pro', () => {
    view({ ent: pro });
    expect(screen.getByRole('heading', { level: 1, name: 'Você está no Pro.' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mensal/ })).toBeNull();
    expect(screen.getByText('Seu plano atual')).toBeInTheDocument();
    expect(screen.queryByText('Recomendado')).toBeNull();
  });

  it('toggle switches the period, tracks it and moves the Pro price to the annual price', async () => {
    view();
    const table = screen.getByRole('table');
    expect(await within(table).findByText('R$ 39,00', { selector: '[torph-sr]' })).toBeInTheDocument(); // o Torph chega depois da 1ª pintura (P-512)
    fireEvent.click(screen.getByRole('button', { name: /Anual/ }));
    expect(track).toHaveBeenCalledWith('plans_period_changed', { period: 'annual' });
    expect(screen.getByRole('button', { name: /Anual/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(table).getByText(/^R\$ 349,00$/, { selector: '[torph-sr]' })).toBeInTheDocument();
  });

  it('opens on the annual period when the provider says so', () => {
    view({ period: 'annual' });
    expect(screen.getByRole('button', { name: /Anual/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('limit banner only at or above 80% of boards or cards, with an anchor to the summary', () => {
    view({ ent: withUsage(free, { boards: 1, cards: 20 }) });
    expect(screen.queryByText(/O Pro libera o resto/)).toBeNull();
    cleanup();
    view({ ent: withUsage(free, { boards: 2 }) });
    expect(screen.getByRole('status')).toHaveTextContent('Você usou 2 de 2 mapas. O Pro libera o resto.');
    expect(screen.getByRole('link', { name: 'Ver o resumo' })).toHaveAttribute('href', '#resumo');
    expect(screen.getByText('Recomendado')).toBeInTheDocument();
    cleanup();
    view({ ent: withUsage(free, { boards: 0, cards: 45 }) });
    expect(screen.getByRole('status')).toHaveTextContent('Você usou 45 de 50 cards');
  });

  it('usage shows only in the current plan column and uses the per-limit wording', () => {
    view({ ent: withUsage(free, { boards: 2, ai_grades: 3, ai_generations: 1 }) });
    expect(screen.getByText('Você usa 2 de 2')).toBeInTheDocument();
    expect(screen.getByText('Hoje: 3 de 20')).toBeInTheDocument();
    expect(screen.queryByText(/Neste mês/)).toBeNull(); // Free: PDF maps not included (0), no "1 de 0" line
    expect(screen.getAllByText('Não incluso').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Você tem/)).toBeNull();
    cleanup();
    view({ ent: pro });
    expect(screen.queryByText(/Você usa/)).toBeNull();
    expect(screen.getByText('Você tem 7 mapas')).toBeInTheDocument();
    expect(screen.getByText(`Hoje: ${pro.usage.ai_grades} de ${pro.limits.ai_grades}`)).toBeInTheDocument();
  });

  it('entitlements failed: matrix without any usage line (FR-12)', () => {
    view({ ent: null });
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByText(/Você usa|Hoje:|Neste mês/)).toBeNull();
  });

  it('FAQ: one open at a time and faq_opened carries the index', () => {
    view();
    const q = screen.getByRole('button', { name: 'O que acontece com meus mapas se eu voltar ao Free?' });
    expect(q).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(q);
    expect(q).toHaveAttribute('aria-expanded', 'true');
    expect(track).toHaveBeenCalledWith('faq_opened', { index: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Como eu pago?' }));
    expect(q).toHaveAttribute('aria-expanded', 'false');
    expect(track).toHaveBeenCalledWith('faq_opened', { index: 2 });
  });

  it('?cancelado=1: toast, checkout_canceled once, query cleared', async () => {
    view({ canceled: true });
    expect(await screen.findByText('Pagamento cancelado. Nada foi cobrado.')).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('checkout_canceled', {});
    expect(replace).toHaveBeenCalledWith('/app/planos');
  });
});
