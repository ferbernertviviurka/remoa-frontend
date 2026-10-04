import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/safe-next';

// D-322: tudo que exige sessão vive em `/app/*`; `/m/<token>` (link compartilhado, F17) e o resto ficam públicos.
// F19 D-453: /admin/** also needs a session here; the role check (404) lives in the admin layout via GET /v1/admin/me.
const isProtected = (path: string) => ['/app', '/admin'].some((p) => path === p || path.startsWith(`${p}/`));
// D-320: quem já está logado não vê os formulários de entrada (parecia que a sessão tinha caído).
const isAuthForm = (path: string) => path === '/entrar' || path === '/cadastro';

export async function middleware(request: NextRequest) {
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

  const { data } = await supabase.auth.getUser(); // refreshes the session cookies
  const { pathname, search, searchParams } = request.nextUrl;
  const redirect = (to: string) => {
    const res = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c)); // keep a token refreshed by getUser()
    return res;
  };
  if (!data.user && isProtected(pathname)) return redirect(`/entrar?next=${encodeURIComponent(pathname + search)}`);
  if (data.user && isAuthForm(pathname)) return redirect(safeNext(searchParams.get('next')));
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)'],
};
