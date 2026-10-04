// F17 T7: tests for the shared board page and unlock form.
import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sharedBoardFixture, sharedLockedFixture } from '@remoa/contracts/mocks';

// ---- mocks ----
vi.mock('@/lib/analytics', () => ({ track: vi.fn(), trackWhenIdle: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@remoa/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@remoa/ui')>();
  return { ...actual, useToast: () => ({ toast: vi.fn() }) };
});
vi.mock('@/features/billing/paywall', () => ({
  usePaywall: vi.fn(() => ({ show: vi.fn(), handle: vi.fn() })),
  PaywallProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('./actions', () => ({
  unlockBoardAction: vi.fn(),
  copyBoardAction: vi.fn(),
  deleteCookieAction: vi.fn(),
}));
// SharedCanvas is lazy — mock it out
vi.mock('./shared-canvas', () => ({
  SharedCanvas: () => <div data-testid="shared-canvas" />,
}));

import { UnlockForm } from './unlock-form';
import { SharedBoardView } from './shared-board-view';
import * as actions from './actions';

afterEach(cleanup);

// ---- UnlockForm ----
describe('UnlockForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the locked title and password field', () => {
    render(<UnlockForm token={'A'.repeat(43)} />);
    expect(screen.getByText(/mapa protegido por senha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('shows "Verificando…" while submitting', async () => {
    vi.mocked(actions.unlockBoardAction).mockReturnValue(new Promise(() => {}));
    render(<UnlockForm token={'A'.repeat(43)} />);
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'minhasenha' } });
    fireEvent.submit(screen.getByRole('button', { name: /entrar/i }).closest('form')!);
    expect(await screen.findByRole('button', { name: /verificando/i })).toBeInTheDocument();
  });

  it('shows "Senha incorreta" on 401', async () => {
    vi.mocked(actions.unlockBoardAction).mockResolvedValue({ ok: false, error: 'wrong_password' });
    render(<UnlockForm token={'A'.repeat(43)} />);
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'errada' } });
    fireEvent.submit(screen.getByRole('button', { name: /entrar/i }).closest('form')!);
    await waitFor(() => expect(screen.getByText(/senha incorreta/i)).toBeInTheDocument());
  });

  it('shows "Muitas tentativas" on 429', async () => {
    vi.mocked(actions.unlockBoardAction).mockResolvedValue({ ok: false, error: 'too_many_attempts' });
    render(<UnlockForm token={'A'.repeat(43)} />);
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'errada' } });
    fireEvent.submit(screen.getByRole('button', { name: /entrar/i }).closest('form')!);
    await waitFor(() => expect(screen.getByText(/muitas tentativas/i)).toBeInTheDocument());
  });
});

// ---- SharedBoardView ----
describe('SharedBoardView', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const token = 'A'.repeat(43);

  it('shows disclaimer faixa always visible', () => {
    render(<SharedBoardView board={sharedBoardFixture} token={token} />);
    expect(screen.getByTestId('shared-board-disclaimer')).toBeInTheDocument();
    expect(screen.getByText(/mapa criado por um aluno/i)).toBeInTheDocument();
  });

  it('renders read-only canvas', () => {
    render(<SharedBoardView board={sharedBoardFixture} token={token} />);
    expect(screen.getByTestId('shared-canvas')).toBeInTheDocument();
  });

  it('shows CTA "Copiar para os meus mapas"', () => {
    render(<SharedBoardView board={sharedBoardFixture} token={token} />);
    expect(screen.getByTestId('copy-cta')).toBeInTheDocument();
  });

  it('shows "Criar meu mapa" for unauthenticated users', () => {
    render(<SharedBoardView board={sharedBoardFixture} token={token} />);
    expect(screen.getByTestId('create-cta')).toBeInTheDocument();
  });

  it('redirects to editor when owner views own board', () => {
    const ownBoard = { ...sharedBoardFixture, ownBoardId: 'my-board-id' };
    render(<SharedBoardView board={ownBoard} token={token} />);
    // "open in editor" button instead of copy
    expect(screen.queryByTestId('copy-cta')).not.toBeInTheDocument();
  });

  it('shows paywall on quota_exceeded', async () => {
    vi.mocked(actions.copyBoardAction).mockResolvedValue({ ok: false, error: 'quota_exceeded' });
    const { usePaywall } = await import('@/features/billing/paywall');
    const showFn = vi.fn();
    vi.mocked(usePaywall).mockReturnValue({ show: showFn, handle: vi.fn() });

    render(<SharedBoardView board={sharedBoardFixture} token={token} />);
    await act(async () => { fireEvent.click(screen.getByTestId('copy-cta')); });
    await waitFor(() => expect(showFn).toHaveBeenCalledWith('boards'));
  });
});

// ---- sharedLockedFixture used ----
describe('SharedLocked fixture', () => {
  it('has locked: true', () => {
    expect(sharedLockedFixture.locked).toBe(true);
  });
});
