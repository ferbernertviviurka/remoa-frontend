import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RETENTION } from '@remoa/contracts';
import { accountFreeFixture, accountDeletionFixture } from '@remoa/contracts/mocks';
import { ToastProvider } from '@remoa/ui';
import { AccountProvider } from '../shell/account-context';
import { DataSection } from './data-section';

const api = vi.fn();
const track = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
URL.createObjectURL = vi.fn(() => 'blob:x');
URL.revokeObjectURL = vi.fn();

const view = (initial = accountFreeFixture) =>
  render(
    <ToastProvider closeLabel="Fechar" viewportLabel="Avisos">
      <AccountProvider initial={initial}>
        <DataSection />
      </AccountProvider>
    </ToastProvider>,
  );
// /me answers a real snapshot; other calls only need ok.
beforeEach(() => api.mockImplementation(async (path: string) => ({ ok: true, data: path === '/v1/account/me' ? accountDeletionFixture : {} })));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DataSection', () => {
  it('retention comes from RETENTION', () => {
    view();
    expect(screen.getByText(`Apagadas automaticamente depois de ${RETENTION.answerTextDays} dias.`)).toBeVisible();
  });

  it('exports, then offers download and regenerate', async () => {
    api.mockResolvedValue({ ok: true, data: { exportedAt: 'x' } });
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Exportar meus dados' }));
    const dl = await screen.findByRole('button', { name: 'Baixar' });
    expect(track).toHaveBeenCalledWith('export_requested', {});
    fireEvent.click(dl);
    expect(track).toHaveBeenCalledWith('export_downloaded', {});
    expect(screen.getByRole('button', { name: 'Gerar de novo' })).toBeVisible();
  });

  it('429 on export shows the once-an-hour notice', async () => {
    api.mockResolvedValue({ ok: false, error: { code: 'rate_limited', message: 'x' } });
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Exportar meus dados' }));
    expect(await screen.findByText(/última hora/)).toBeVisible();
  });

  it('delete confirm needs EXCLUIR in any case, then schedules and refreshes', async () => {
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir conta' }));
    const field = screen.getByLabelText('Digite EXCLUIR para confirmar');
    const dialogBtn = screen.getAllByRole('button', { name: 'Excluir conta' }).at(-1)!;
    expect(dialogBtn).toBeDisabled();
    fireEvent.change(field, { target: { value: 'exclui' } });
    expect(dialogBtn).toBeDisabled();
    fireEvent.change(field, { target: { value: 'excluir' } });
    expect(dialogBtn).toBeEnabled();
    fireEvent.click(dialogBtn);
    await waitFor(() => expect(track).toHaveBeenCalledWith('deletion_requested', {}));
    expect(api).toHaveBeenCalledWith('/v1/account', { method: 'DELETE' });
    expect(api).toHaveBeenCalledWith('/v1/account/me');
  });

  it('already scheduled: shows the date instead of the button', () => {
    view(accountDeletionFixture);
    expect(screen.getByText(/Exclusão agendada para/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Excluir conta' })).toBeNull();
  });
});
