import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { accountFreeFixture } from '@remoa/contracts/mocks';
import type { AccountSnapshot } from '@remoa/contracts';
import { ToastProvider } from '@remoa/ui';
import { AccountProvider } from '../shell/account-context';
import { PreferencesSection } from './preferences-section';

const api = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
// G16: the store waitlist row reads /v1/store/waitlist on mount; it has its own tests (features/store), keep this suite about preferences
vi.mock('../../store/account-setting', () => ({ StoreWaitlistSetting: () => null }));

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

  it('dark theme is listed as "Em breve" and cannot be selected; the new-cards stepper is gone (D-556)', () => {
    view(accountFreeFixture);
    const dark = screen.getByRole('radio', { name: /Escuro/ });
    expect(dark).toBeDisabled();
    expect(dark).toHaveAttribute('aria-disabled', 'true');
    expect(dark).toHaveAccessibleDescription('O tema escuro ainda não está disponível e não pode ser escolhido.');
    expect(screen.getByText('Em breve')).toBeVisible();
    fireEvent.click(dark);
    expect(api).not.toHaveBeenCalled();
    expect(screen.queryByText('Cards novos por dia')).toBeNull();
  });

  it('turning the reminder on reveals the hour chips', async () => {
    api.mockResolvedValue({ ok: true, data: { ...accountFreeFixture.preferences, reminderEnabled: true } });
    view(accountFreeFixture);
    fireEvent.click(screen.getByRole('switch', { name: 'Lembrete diário por e-mail' }));
    expect(await screen.findByRole('radio', { name: '21h' })).toBeVisible();
  });
});
