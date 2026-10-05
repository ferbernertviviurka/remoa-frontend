import { afterEach, describe, expect, it, vi } from 'vitest';
import { signOutToLogin } from './sign-out';

const signOut = vi.fn();
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { signOut: (o: unknown) => signOut(o) } }) }));
const replace = vi.fn();
vi.stubGlobal('location', { replace });
afterEach(() => vi.clearAllMocks());

describe('signOutToLogin (G14 D-585)', () => {
  it('ends only this device and fully loads /entrar', async () => {
    signOut.mockResolvedValue({ error: null });
    expect(await signOutToLogin()).toBe(true);
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(replace).toHaveBeenCalledWith('/entrar');
  });
  it('stays put when Supabase refuses (the session is still live)', async () => {
    signOut.mockResolvedValue({ error: new Error('network') });
    expect(await signOutToLogin()).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });
});
