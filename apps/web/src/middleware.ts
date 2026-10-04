import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const protectedPrefixes = ['/hoje', '/mapas', '/revisar', '/cobertura', '/loja', '/conta', '/m', '/editorial', '/progresso'];
// F17: `/m/<token>` (43 caracteres base64url) é a página pública do link; `/m/revisar` (F09) segue protegido.
const isSharedBoardPath = (path: string) => /^\/m\/[A-Za-z0-9_-]{43}\/?$/.test(path);
const isProtected = (path: string) =>
  !isSharedBoardPath(path) && protectedPrefixes.some((p) => path === p || path.startsWith(`${p}/`));

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
  const { pathname, search } = request.nextUrl;
  if (!data.user && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/entrar';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (data.user && pathname === '/') {
    // D-086: Hoje vive em `/` para quem está logado; deslogado continua vendo a landing.
    const url = request.nextUrl.clone();
    url.pathname = '/hoje';
    const rewrite = NextResponse.rewrite(url, { request });
    response.cookies.getAll().forEach((c) => rewrite.cookies.set(c));
    return rewrite;
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw\\.js|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)'],
};
