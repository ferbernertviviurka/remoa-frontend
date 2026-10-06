import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/safe-next';

// D-322: tudo que exige sessão vive em `/app/*`; `/m/<token>` (link compartilhado, F17) e o resto ficam públicos.
// F19 D-453: /admin/** also needs a session here; the role check (404) lives in the admin layout via GET /v1/admin/me.
const isProtected = (path: string) => ['/app', '/admin'].some((p) => path === p || path.startsWith(`${p}/`));
// D-320: quem já está logado não vê os formulários de entrada (parecia que a sessão tinha caído).
const isAuthForm = (path: string) => path === '/entrar' || path === '/cadastro';

export async function middleware(request: NextRequest) {
  request.headers.set('x-remoa-path', request.nextUrl.pathname + request.nextUrl.search); // read by requireCompleteProfile (G20)
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { pathname, search, searchParams } = request.nextUrl;
  // D-565: RSC navigations, prefetches and server actions verify the JWT locally (getClaims: JWKS, no Auth round trip; it still
  // refreshes an expired token through the cookies); the API checks the session on every call anyway. Full page loads and the
  // auth forms keep getUser(): a revoked session (D-124) then lands on /entrar with its cookies cleared, and /entrar never
  // bounces a revoked session back into /app (no redirect loop).
  const soft = !isAuthForm(pathname) && (request.headers.has('rsc') || request.headers.has('next-router-prefetch') || request.headers.has('next-action'));
  const signedIn = soft ? !!(await supabase.auth.getClaims()).data?.claims.sub : !!(await supabase.auth.getUser()).data.user;
  const redirect = (to: string) => {
    const res = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c)); // keep a token refreshed by getUser()/getClaims()
    return res;
  };
  if (!signedIn && isProtected(pathname)) return redirect(`/entrar?next=${encodeURIComponent(pathname + search)}`);
  if (signedIn && isAuthForm(pathname)) return redirect(safeNext(searchParams.get('next')));
  return response;
}

export const config = {
  // D-707: Vercel services reject Edge Function output, so the middleware runs on Node (stable since Next 15.5).
  runtime: 'nodejs',
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw\\.js|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)'],
};
