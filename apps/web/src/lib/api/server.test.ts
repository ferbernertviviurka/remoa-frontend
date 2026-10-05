import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn();
const redirect = vi.fn(() => { throw new Error('NEXT_REDIRECT'); });
let token: string | null = 'tok';

vi.mock('next/navigation', () => ({ redirect }));
vi.mock('./index', () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }));
vi.mock('@/lib/request-id', () => ({ getRequestId: async () => 'rid' }));
vi.mock('./client-ip', () => ({ clientIpHeaders: async () => ({}) }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getSession: async () => ({ data: { session: token ? { access_token: token } : null } }) } }) }));

const { serverApi } = await import('./server');

describe('serverApi (D-565)', () => {
  beforeEach(() => { apiFetch.mockReset(); redirect.mockClear(); token = 'tok'; });

  it('a revoked session (API 401 with a token) goes to /entrar', async () => {
    apiFetch.mockResolvedValue({ ok: false, error: { code: 'unauthorized', message: 'x' } });
    await expect(serverApi('/v1/home', { method: 'POST' })).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/entrar');
  });

  it('no token, or another error, comes back as a Result', async () => {
    apiFetch.mockResolvedValue({ ok: false, error: { code: 'forbidden', message: 'x' } });
    expect(await serverApi('/v1/home', { method: 'POST' })).toMatchObject({ ok: false });
    token = null;
    apiFetch.mockResolvedValue({ ok: false, error: { code: 'unauthorized', message: 'x' } });
    expect(await serverApi('/v1/public/x', { method: 'POST' })).toMatchObject({ ok: false });
    expect(redirect).not.toHaveBeenCalled();
  });
});
