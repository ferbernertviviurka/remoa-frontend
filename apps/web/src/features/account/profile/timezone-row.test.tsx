import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { accountFreeFixture } from '@remoa/contracts/mocks';
import { Wrap } from '../test-utils';
import { TimezoneRow } from './timezone-row';

const api = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
Element.prototype.scrollIntoView = vi.fn();
Element.prototype.hasPointerCapture = vi.fn(() => false);
Element.prototype.releasePointerCapture = vi.fn();
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const pick = async (name: string) => {
  const trigger = screen.getByRole('combobox', { name: 'Fuso horário' });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'Enter' });
  fireEvent.click(await screen.findByRole('option', { name }));
};

describe('TimezoneRow', () => {
  it('troca o fuso por PATCH do perfil e avisa do reagendamento', async () => {
    api.mockResolvedValue({ ok: true, data: {} });
    render(<Wrap initial={accountFreeFixture}><TimezoneRow /></Wrap>);
    await pick('America/Manaus');
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/account/profile', { method: 'PATCH', body: '{"timezone":"America/Manaus"}' }));
    expect(await screen.findByText('Os avisos do calendário foram reagendados para o novo fuso.')).toBeTruthy();
  });

  it('volta ao fuso anterior e não avisa quando a API falha', async () => {
    api.mockResolvedValue({ ok: false, error: { code: 'internal', message: 'x' } });
    render(<Wrap initial={accountFreeFixture}><TimezoneRow /></Wrap>);
    await pick('America/Manaus');
    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(screen.queryByText(/reagendados/)).toBeNull();
  });
});
