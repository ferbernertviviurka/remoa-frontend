import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { accountFreeFixture, accountProFixture } from '@remoa/contracts/mocks';
import type { AccountSnapshot } from '@remoa/contracts';
import { ToastProvider } from '@remoa/ui';
import { AccountProvider } from '../shell/account-context';
import { PlanSection } from './plan-section';

const push = vi.fn();
const track = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@/lib/api', () => ({ api: vi.fn() }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));

const view = (a: AccountSnapshot) =>
  render(
    <ToastProvider closeLabel="Fechar" viewportLabel="Avisos">
      <AccountProvider initial={a}>
        <PlanSection />
      </AccountProvider>
    </ToastProvider>,
  );
const withUsage = (a: AccountSnapshot, usage: Partial<AccountSnapshot['entitlements']['usage']>): AccountSnapshot => ({
  ...a,
  entitlements: { ...a.entitlements, usage: { ...a.entitlements.usage, ...usage } },
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PlanSection', () => {
  it('referral card goes to /app/indicar?de=account for both plans', () => {
    for (const a of [accountFreeFixture, accountProFixture]) {
      view(a);
      fireEvent.click(screen.getByRole('button', { name: 'Convidar amigos' }));
      expect(push).toHaveBeenLastCalledWith('/app/indicar?de=account');
      cleanup();
    }
  });


  it('free: offer with period toggle and upgrade tracking', () => {
    view(withUsage(accountFreeFixture, { boards: 0, cards: 0, ai_grades: 0, ai_generations: 0 }));
    expect(screen.getByText('R$ 39')).toBeVisible();
    fireEvent.click(screen.getByRole('radio', { name: 'Anual' }));
    expect(screen.getByText('R$ 349')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Assinar o Pro' }));
    expect(track).toHaveBeenCalledWith('upgrade_clicked', { source: 'account_plan' });
    expect(push).toHaveBeenCalledWith('/app/planos?de=account_plan&periodo=anual');
  });

  it('pro: manage button, no offer, unlimited meters', () => {
    view(withUsage(accountProFixture, { boards: 9, cards: 900, ai_grades: 80, ai_generations: 2 }));
    expect(screen.getByRole('button', { name: 'Gerenciar assinatura' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Assinar o Pro' })).toBeNull();
    expect(screen.getAllByText(/Ilimitad/).length).toBeGreaterThanOrEqual(3);
  });

  it('80% warns with "Ver o Pro"; 100% says the limit was reached', () => {
    view(withUsage(accountFreeFixture, { boards: 2, cards: 42, ai_grades: 0, ai_generations: 0 }));
    expect(screen.getByText('Perto do limite. O Pro remove esse teto.')).toBeVisible();
    expect(screen.getAllByText('Limite atingido. O Pro remove esse teto.')).toHaveLength(1);
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver o Pro' })[0]!);
    expect(track).toHaveBeenCalledWith('upgrade_clicked', { source: 'usage_nudge' });
  });
});
