import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { ONBOARDING_HOME, safeNext } from '@/lib/safe-next';
import { siteUrl } from '@/lib/site-url';
import { REFERRAL_COOKIE, attribute } from '@/features/referral/invite/attribution';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = siteUrl(request.nextUrl.origin); // behind a proxy nextUrl.origin can be internal/localhost
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeNext(searchParams.get('next'));
  const supabase = await createClient();
  // PKCE (?code=, same browser that signed up) or e-mail link (?token_hash=&type=, works on any device).
  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash }) : { data: null, error: new Error('no credentials') };
  if (!error) {
    const res = NextResponse.redirect(`${origin}${next}`);
    // D-383: `?rf=` (Google) or the cookie (e-mail confirmation in the same browser). Never blocks the sign-in.
    const rf = searchParams.get('rf') ?? request.cookies.get(REFERRAL_COOKIE)?.value;
    if (rf) {
      const r = await attribute(rf, data?.session?.access_token ?? null);
      if (r.done) res.cookies.delete(REFERRAL_COOKIE);
    }
    return res;
  }
  // Sign-up confirmation that failed (expired, used, or opened in another browser): the dedicated screen explains and resends.
  return NextResponse.redirect(`${origin}${next === ONBOARDING_HOME ? '/confirmar-email?error=1' : '/entrar?error=callback'}`);
}
