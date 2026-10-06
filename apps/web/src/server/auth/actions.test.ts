import { beforeEach, describe, expect, it, vi } from 'vitest';

const signUpApi = vi.fn(async (arg: unknown) => ({ error: arg ? null : null }));
const otpApi = vi.fn(async (arg: unknown) => ({ error: arg ? null : null }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { signUp: signUpApi, signInWithOtp: otpApi } }) }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ origin: 'http://localhost:3000' }), cookies: async () => ({ get: () => undefined }) }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
const legal = vi.hoisted(() => ({ termsVersion: '', privacyVersion: '' }));
vi.mock('@/features/legal/config', () => ({ LEGAL_CONFIG: legal }));

import { sendMagicLink, signUp } from './actions';

const input = { email: 'a@b.com', password: 'Senha-forte-123', name: 'Ana' } as Parameters<typeof signUp>[0];

const apiFetch = vi.fn<(url: string) => Promise<Response>>();
vi.stubGlobal('fetch', apiFetch);

describe('legal acceptance at sign-up (D-913)', () => {
  beforeEach(() => {
    signUpApi.mockClear();
    otpApi.mockClear();
    apiFetch.mockReset().mockRejectedValue(new Error('api down'));
    Object.assign(legal, { termsVersion: '2026-10-01', privacyVersion: '2026-10-02' });
  });
  it('signUp sends the server versions in options.data', async () => {
    await signUp(input);
    const data = (signUpApi.mock.calls[0]![0] as { options: { data: Record<string, string> } }).options.data;
    expect(data).toMatchObject({ name: 'Ana', terms_version: '2026-10-01', privacy_version: '2026-10-02' });
  });
  it('sendMagicLink sends them too, and omits unset ones', async () => {
    await sendMagicLink({ email: 'a@b.com' } as Parameters<typeof sendMagicLink>[0]);
    expect((otpApi.mock.calls[0]![0] as { options: { data: unknown } }).options.data).toEqual({ terms_version: '2026-10-01', privacy_version: '2026-10-02' });
    legal.termsVersion = '';
    await sendMagicLink({ email: 'a@b.com' } as Parameters<typeof sendMagicLink>[0]);
    expect((otpApi.mock.calls[1]![0] as { options: { data: unknown } }).options.data).toEqual({ privacy_version: '2026-10-02' });
  });
  it('P-416: the API versions win over the web config; the config is the fallback', async () => {
    apiFetch.mockResolvedValue(Response.json({ ok: true, data: { termsVersion: '0.1', privacyVersion: '0.2' } }));
    await signUp(input);
    expect(apiFetch.mock.calls[0]![0]).toContain('/v1/public/legal/versions');
    const data = (signUpApi.mock.calls[0]![0] as { options: { data: Record<string, string> } }).options.data;
    expect(data).toMatchObject({ terms_version: '0.1', privacy_version: '0.2' });
  });
});
