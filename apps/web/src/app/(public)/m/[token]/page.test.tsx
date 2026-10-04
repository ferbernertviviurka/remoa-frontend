// F17 T7: tests for the shared board page and unlock form.
import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sharedBoardFixture, sharedLockedFixture } from '@remoa/contracts/mocks';

// ---- mocks ----
const nav = vi.hoisted(() => ({ search: new URLSearchParams() }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn(), trackWhenIdle: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => nav.search,
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND');
  }),
}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/lib/api/server', () => ({ serverApi: vi.fn() }));
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
}));
// SharedCanvas is lazy — mock it out
vi.mock('./shared-canvas', () => ({
  SharedCanvas: () => <div data-testid="shared-canvas" />,
}));

import { UnlockForm } from './unlock-form';
import { SharedBoardView } from './shared-board-view';
import * as actions from './actions';
import SharedBoardPage from './page';
import { serverApi } from '@/lib/api/server';

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

  it('redirects to editor when owner views own board (D-295)', async () => {
    vi.mocked(serverApi).mockResolvedValue({ ok: true, data: { ...sharedBoardFixture, ownBoardId: 'my-board-id' } });
    await expect(SharedBoardPage({ params: Promise.resolve({ token: 'A'.repeat(43) }) })).rejects.toThrow('REDIRECT /app/mapas/my-board-id');
  });

  it('does not redirect a visitor', async () => {
    vi.mocked(serverApi).mockResolvedValue({ ok: true, data: sharedBoardFixture });
    await expect(SharedBoardPage({ params: Promise.resolve({ token: 'A'.repeat(43) }) })).resolves.toBeTruthy();
  });

  // D-544: `?copiar=1` copies only for the tab that asked (intent set before the login), never from a link alone.
  it('?copiar=1 without this tab\'s intent does not copy', async () => {
    nav.search = new URLSearchParams('copiar=1');
    sessionStorage.clear();
    const copy = vi.mocked(actions.copyBoardAction).mockResolvedValue({ ok: false, error: 'not_found' });
    copy.mockClear();
    render(<SharedBoardView board={sharedBoardFixture} token={token} />);
    await act(async () => {});
    expect(copy).not.toHaveBeenCalled();
    nav.search = new URLSearchParams();
  });

  it('?copiar=1 with the intent copies once and clears it', async () => {
    nav.search = new URLSearchParams('copiar=1');
    sessionStorage.setItem('remoa-copy-intent', token);
    const copy = vi.mocked(actions.copyBoardAction).mockResolvedValue({ ok: false, error: 'not_found' });
    copy.mockClear();
    render(<SharedBoardView board={sharedBoardFixture} token={token} />);
    await waitFor(() => expect(copy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(sessionStorage.getItem('remoa-copy-intent')).toBeNull());
    nav.search = new URLSearchParams();
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
