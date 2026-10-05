import { afterEach, describe, expect, it, vi } from 'vitest';

const set = vi.fn();
const reqHeaders = new Headers({ 'x-forwarded-for': '200.1.2.3, 10.0.0.1' });
vi.mock('next/headers', () => ({ cookies: async () => ({ set }), headers: async () => reqHeaders }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/request-id', () => ({ getRequestId: async () => 'r1' }));

import { unlockBoardAction } from './actions';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('unlockBoardAction (D-503)', () => {
  it('stores the grant from the API envelope in the scoped cookie', async () => {
    const expiresAt = new Date(Date.now() + 3_600_000).toISOString();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: { value: 'g1.1.sig', expiresAt } }) }));
    const token = 'A'.repeat(43);
    expect(await unlockBoardAction(token, 'turma2026')).toEqual({ ok: true });
    expect(set).toHaveBeenCalledWith('remoa_share', 'g1.1.sig', expect.objectContaining({ httpOnly: true, path: `/m/${token}`, sameSite: 'lax' }));
  });

  it('D-537: sends the browser IP as the trusted pair, never a bare x-forwarded-for; no secret = no IP header', async () => {
    const ok = { ok: true, status: 200, json: async () => ({ ok: true, data: { value: 'g', expiresAt: new Date(Date.now() + 1000).toISOString() } }) };
    const fetchMock = vi.fn().mockResolvedValue(ok);
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('PROXY_SHARED_SECRET', 's3cret');
    await unlockBoardAction('A'.repeat(43), 'x');
    expect(fetchMock.mock.calls[0]![1].headers).toMatchObject({ 'x-remoa-client-ip': '200.1.2.3', 'x-remoa-proxy-secret': 's3cret' });
    expect(fetchMock.mock.calls[0]![1].headers['x-forwarded-for']).toBeUndefined();
    vi.stubEnv('PROXY_SHARED_SECRET', '');
    await unlockBoardAction('A'.repeat(43), 'x');
    expect(fetchMock.mock.calls[1]![1].headers['x-remoa-client-ip']).toBeUndefined();
  });
});
