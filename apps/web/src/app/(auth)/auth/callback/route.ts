import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-next';
import { REFERRAL_COOKIE, attribute } from '@/features/referral/invite/attribution';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const res = NextResponse.redirect(`${origin}${next}`);
      // D-383: `?rf=` (Google) or the cookie (e-mail confirmation in the same browser). Never blocks the sign-in.
      const rf = searchParams.get('rf') ?? request.cookies.get(REFERRAL_COOKIE)?.value;
      if (rf) {
        const r = await attribute(rf, data.session?.access_token ?? null);
        if (r.done) res.cookies.delete(REFERRAL_COOKIE);
      }
      return res;
    }
  }
  return NextResponse.redirect(`${origin}/entrar?error=callback`);
}
