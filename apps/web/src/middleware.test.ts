import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const auth = { getClaims: vi.fn(), getUser: vi.fn() };
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth }) }));
const { middleware } = await import('./middleware');

const req = (path: string, headers: Record<string, string> = {}) => new NextRequest(new URL(path, 'http://localhost:3000'), { headers });
// jsdom swaps the global Headers; NextResponse.next({ request }) checks `instanceof Headers` against the platform one.
vi.stubGlobal('Headers', req('/').headers.constructor);
const session = (on: boolean) => {
  auth.getClaims.mockResolvedValue(on ? { data: { claims: { sub: 'u1' } }, error: null } : { data: null, error: new Error('no session') });
  auth.getUser.mockResolvedValue({ data: { user: on ? { id: 'u1' } : null }, error: null });
};

describe('middleware (D-565)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('RSC navigation and prefetch verify locally (getClaims), no Auth round trip', async () => {
    session(true);
    expect((await middleware(req('/app/hoje', { rsc: '1' }))).status).toBe(200);
    expect((await middleware(req('/app/mapas', { rsc: '1', 'next-router-prefetch': '1' }))).status).toBe(200);
    expect(auth.getClaims).toHaveBeenCalledTimes(2);
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it('full page load keeps getUser (revoked session lands on /entrar)', async () => {
    session(false);
    const res = await middleware(req('/app/hoje?x=1'));
    expect(auth.getUser).toHaveBeenCalledTimes(1);
    expect(auth.getClaims).not.toHaveBeenCalled();
    expect(res.headers.get('location')).toBe('http://localhost:3000/entrar?next=%2Fapp%2Fhoje%3Fx%3D1');
  });

  it('protected RSC request without a valid token redirects to /entrar', async () => {
    session(false);
    const res = await middleware(req('/admin', { rsc: '1' }));
    expect(res.headers.get('location')).toBe('http://localhost:3000/entrar?next=%2Fadmin');
  });

  it('auth forms always use getUser, even as RSC (a revoked session is not bounced back into /app)', async () => {
    session(false);
    expect((await middleware(req('/entrar', { rsc: '1' }))).status).toBe(200);
    expect(auth.getUser).toHaveBeenCalledTimes(1);
    expect(auth.getClaims).not.toHaveBeenCalled();
    session(true);
    expect((await middleware(req('/entrar?next=/app/mapas', { rsc: '1' }))).headers.get('location')).toBe('http://localhost:3000/app/mapas');
  });

  it('public pages pass through either way', async () => {
    session(false);
    expect((await middleware(req('/m/abc', { rsc: '1' }))).status).toBe(200);
  });
});
