import { afterEach, describe, expect, it, vi } from 'vitest';

const serverApi = vi.fn();
vi.mock('@/lib/api/server', () => ({ serverApi: (...a: unknown[]) => serverApi(...a) }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND'); } }));
const { requireAdmin, adminGet } = await import('./api');
const { runAdminAction } = await import('./actions');

afterEach(() => vi.clearAllMocks());

describe('admin guard (CLAUDE.md rule 9)', () => {
  it('non-admin (404 from /me) -> notFound', async () => {
    serverApi.mockResolvedValue({ ok: false, error: { code: 'not_found', message: 'x' } });
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });
  it.each(['forbidden', 'not_found', 'unauthorized'])('%s -> notFound', async (code) => {
    serverApi.mockResolvedValue({ ok: false, error: { code, message: 'x' } });
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });
  it.each(['rate_limited', 'internal'])('transient %s -> throws (error boundary), never 404', async (code) => {
    serverApi.mockResolvedValue({ ok: false, error: { code, message: 'x' } });
    await expect(requireAdmin()).rejects.toThrow(code);
  });
  it('network failure -> throws, never 404', async () => {
    serverApi.mockRejectedValue(new Error('offline'));
    await expect(requireAdmin()).rejects.toThrow('offline');
  });
  it('adminGet throws on rate_limited', async () => {
    serverApi.mockResolvedValue({ ok: false, error: { code: 'rate_limited', message: 'x' } });
    await expect(adminGet('/users')).rejects.toThrow('rate_limited');
  });
  it('admin passes', async () => {
    serverApi.mockResolvedValue({ ok: true, data: { id: 'u', name: null, email: 'a@b.c', authenticatedAt: new Date(), openTickets: 2 } });
    expect((await requireAdmin()).openTickets).toBe(2);
  });
  it('adminGet prefixes /v1/admin and drops empty params', async () => {
    serverApi.mockResolvedValue({ ok: true, data: [] });
    await adminGet('/users', { q: 'ana', page: 2, plan: undefined, status: '' });
    expect(serverApi).toHaveBeenCalledWith('/v1/admin/users?q=ana&page=2');
  });
});

describe('runAdminAction', () => {
  it('refuses paths outside /v1/admin without calling the API', async () => {
    const r = await runAdminAction('/../account/me', { reason: 'motivo valido' });
    expect(r).toMatchObject({ ok: false, error: { code: 'not_found' } });
    expect(serverApi).not.toHaveBeenCalled();
  });
  it('returns the formatted audit id, and passes reauth_required through', async () => {
    serverApi.mockImplementation(async (path: string, init?: RequestInit) =>
      path === '/v1/admin/me' ? { ok: true, data: { id: 'u' } }
        : init?.body && JSON.parse(String(init.body)).reason === 'sem reauth' ? { ok: false, error: { code: 'forbidden', message: 'reauth_required' } }
        : { ok: true, data: { audit: { id: 1050 }, extra: 1 } });
    expect(await runAdminAction('/users/1/suspend', { reason: 'motivo valido' })).toEqual({ ok: true, auditId: 'a_1050', data: { extra: 1 } });
    expect(await runAdminAction('/users/1/suspend', { reason: 'sem reauth' })).toMatchObject({ ok: false, error: { code: 'reauth_required' } });
  });
});
