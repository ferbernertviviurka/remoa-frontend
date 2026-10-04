import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { accountFreeFixture, priceBookFixture } from '@remoa/contracts/mocks';
import { ToastProvider } from '@remoa/ui';

const permanentRedirect = vi.fn();
const redirect = vi.fn((to: string) => {
  throw new Error(`redirect:${to}`);
});
const serverApi = vi.fn();
const getUser = vi.fn();
vi.mock('next/navigation', () => ({ permanentRedirect: (...a: unknown[]) => permanentRedirect(...a), redirect: (to: string) => redirect(to), useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }) }));
vi.mock('@/lib/api/server', () => ({ serverApi: (...a: unknown[]) => serverApi(...a) }));
vi.mock('@/server/auth/session', () => ({ getUser: () => getUser() }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

import Planos from '../../app/app/(app)/planos/page';
import Precos from '../../app/(marketing)/precos/page';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const api = (prices: unknown, ent: unknown) => (path: string) =>
  Promise.resolve(path.endsWith('prices') ? prices : path.endsWith('entitlements') ? ent : { ok: true, data: null });

describe('/precos', () => {
  it('stays public: redirects to the landing plans section', () => {
    Precos();
    expect(permanentRedirect).toHaveBeenCalledWith('/#planos');
  });
});

describe('/planos page', () => {
  it('signed out: goes to /entrar with next back to /planos', async () => {
    getUser.mockResolvedValue(null);
    await expect(Planos({ searchParams: Promise.resolve({ de: 'boards' }) })).rejects.toThrow(`redirect:/entrar?next=${encodeURIComponent('/app/planos?de=boards')}`);
  });

  it('?periodo=anual opens on the annual period; entitlements failing still renders the matrix', async () => {
    getUser.mockResolvedValue({ id: 'u' });
    serverApi.mockImplementation(api({ ok: true, data: priceBookFixture }, { ok: false, error: { code: 'internal', message: 'x' } }));
    render(<ToastProvider closeLabel="Fechar" viewportLabel="Avisos">{await Planos({ searchParams: Promise.resolve({ periodo: 'anual' }) })}</ToastProvider>);
    expect(screen.getByRole('button', { name: /Anual/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByText(/Você usa/)).toBeNull();
  });

  it('price book failure shows the error state', async () => {
    getUser.mockResolvedValue({ id: 'u' });
    serverApi.mockImplementation(api({ ok: false, error: { code: 'internal', message: 'x' } }, { ok: true, data: accountFreeFixture.entitlements }));
    render(await Planos({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os planos agora.');
  });
});
