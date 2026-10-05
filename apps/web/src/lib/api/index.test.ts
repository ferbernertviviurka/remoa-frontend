import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './index';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('apiFetch dev trace (D-583)', () => {
  it('in dev, a failed call logs route, status and typed error, fires remoa:api-error and masks share tokens', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'ai_unavailable', message: 'ai_not_configured' } }), { status: 503 })));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const seen: unknown[] = [];
    const on = (e: Event) => seen.push((e as CustomEvent).detail);
    window.addEventListener('remoa:api-error', on);
    const r = await apiFetch('/v1/public/shared/SECRET-TOKEN/unlock', 'tok', { method: 'POST' });
    window.removeEventListener('remoa:api-error', on);
    expect(r).toEqual({ ok: false, error: { code: 'ai_unavailable', message: 'ai_not_configured' } });
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/^\[api\] POST \/v1\/public\/shared\/:token\/unlock -> 503 \d+ms ai_unavailable: ai_not_configured$/));
    expect(seen).toEqual([{ method: 'POST', path: '/v1/public/shared/:token/unlock', status: 503, error: { code: 'ai_unavailable', message: 'ai_not_configured' } }]);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('SECRET-TOKEN');
  });

  it('outside dev it stays silent', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'internal', message: 'x' } }), { status: 500 })));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect((await apiFetch('/v1/home', 'tok')).ok).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });
});
