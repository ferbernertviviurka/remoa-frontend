import { beforeEach, describe, expect, it, vi } from 'vitest';

const signUpApi = vi.fn(async (arg: unknown) => ({ error: arg ? null : null }));
const otpApi = vi.fn(async (arg: unknown) => ({ error: arg ? null : null }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { signUp: signUpApi, signInWithOtp: otpApi } }) }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ origin: 'http://localhost:3000' }), cookies: async () => ({ get: () => undefined }) }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

import { sendMagicLink, signUp } from './actions';

const input = { email: 'a@b.com', password: 'Senha-forte-123', name: 'Ana' } as Parameters<typeof signUp>[0];

describe('legal acceptance at sign-up (D-913)', () => {
  beforeEach(() => {
    signUpApi.mockClear();
    otpApi.mockClear();
    vi.stubEnv('LEGAL_TERMS_VERSION', '2026-10-01');
    vi.stubEnv('LEGAL_PRIVACY_VERSION', '2026-10-02');
  });
  it('signUp sends the server versions in options.data', async () => {
    await signUp(input);
    const data = (signUpApi.mock.calls[0]![0] as { options: { data: Record<string, string> } }).options.data;
    expect(data).toMatchObject({ name: 'Ana', terms_version: '2026-10-01', privacy_version: '2026-10-02' });
  });
  it('sendMagicLink sends them too, and omits unset ones', async () => {
    await sendMagicLink({ email: 'a@b.com' } as Parameters<typeof sendMagicLink>[0]);
    expect((otpApi.mock.calls[0]![0] as { options: { data: unknown } }).options.data).toEqual({ terms_version: '2026-10-01', privacy_version: '2026-10-02' });
    vi.stubEnv('LEGAL_TERMS_VERSION', '');
    await sendMagicLink({ email: 'a@b.com' } as Parameters<typeof sendMagicLink>[0]);
    expect((otpApi.mock.calls[1]![0] as { options: { data: unknown } }).options.data).toEqual({ privacy_version: '2026-10-02' });
  });
});
