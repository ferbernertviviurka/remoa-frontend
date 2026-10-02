import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { accountFreeFixture, accountProFixture } from '@remoa/contracts/mocks';
import type { AccountSnapshot } from '@remoa/contracts';
import { ToastProvider } from '@remoa/ui';
import { AccountProvider } from '../shell/account-context';
import { PreferencesSection } from './preferences-section';

const api = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

const view = (a: AccountSnapshot) =>
  render(
    <ToastProvider closeLabel="Fechar" viewportLabel="Avisos">
      <AccountProvider initial={a}>
        <PreferencesSection />
      </AccountProvider>
    </ToastProvider>,
  );
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  delete document.documentElement.dataset.motion;
});

describe('PreferencesSection', () => {
  it('reduce motion sets data-motion on <html> and saves', async () => {
    api.mockResolvedValue({ ok: true, data: { ...accountFreeFixture.preferences, reduceMotion: true } });
    view(accountFreeFixture);
    fireEvent.click(screen.getByRole('switch', { name: 'Reduzir movimento' }));
    expect(document.documentElement.dataset.motion).toBe('reduced');
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/account/preferences', { method: 'PATCH', body: '{"reduceMotion":true}' }));
  });

  it('reverts optimistically on error and shows the error', async () => {
    api.mockResolvedValue({ ok: false, error: { code: 'x' } });
    view(accountFreeFixture);
    const sw = screen.getByRole('switch', { name: 'Reduzir movimento' });
    fireEvent.click(sw);
    await screen.findByText('Não conseguimos salvar a preferência. Tente de novo.');
    expect(sw).toHaveAttribute('aria-checked', 'false');
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });

  it('free: stepper above 10 shows the Pro nudge instead of saving; Pro goes to 20', () => {
    view(accountFreeFixture);
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar cards novos por dia' }));
    expect(screen.getByText('Free permite até 10 por dia. O Pro vai a 20.')).toBeVisible();
    expect(api).not.toHaveBeenCalled();
    cleanup();
    api.mockResolvedValue({ ok: true, data: { ...accountProFixture.preferences, newCardsPerDay: 20 } });
    view({ ...accountProFixture, preferences: { ...accountProFixture.preferences, newCardsPerDay: 15 } });
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar cards novos por dia' }));
    expect(api).toHaveBeenCalledWith('/v1/account/preferences', { method: 'PATCH', body: '{"newCardsPerDay":20}' });
  });

  it('turning the reminder on reveals the hour chips', async () => {
    api.mockResolvedValue({ ok: true, data: { ...accountFreeFixture.preferences, reminderEnabled: true } });
    view(accountFreeFixture);
    fireEvent.click(screen.getByRole('switch', { name: 'Lembrete diário por e-mail' }));
    expect(await screen.findByRole('radio', { name: '21h' })).toBeVisible();
  });
});
