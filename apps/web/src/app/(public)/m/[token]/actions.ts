'use server';

// F17 T7 (FR-14, FR-15): server actions for the shared board page.
// D-322: revalidatePath triggers re-render after cookie is set.
// D-327: share access cookie is scoped to `/m/<token>`, httpOnly, secure (except local http), sameSite=lax.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePaths } from '@/lib/cache';
import { SHARE_ACCESS_COOKIE, SHARE_ACCESS_HEADER, shareTokenSchema, type CopyBoardInput } from '@remoa/contracts';
import type { Board } from '@remoa/contracts';
import { apiBase, apiFetch } from '@/lib/api';
import { clientIpHeaders } from '@/lib/api/client-ip';
import { createClient } from '@/lib/supabase/server';
import { getRequestId } from '@/lib/request-id';

type UnlockResult =
  | { ok: true }
  | { ok: false; error: 'wrong_password' | 'too_many_attempts' | 'not_found' };

/** POST /v1/public/shared/:token/unlock — sets the httpOnly share access cookie on success. */
export async function unlockBoardAction(token: string, password: string): Promise<UnlockResult> {
  if (!shareTokenSchema.safeParse(token).success) return { ok: false, error: 'not_found' };

  const requestId = await getRequestId();

  const res = await fetch(`${apiBase()}/v1/public/shared/${token}/unlock`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(await clientIpHeaders()), // D-537: the per-IP unlock limit keys on the browser, through the trusted pair
      'x-request-id': requestId,
    },
    body: JSON.stringify({ password }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { code?: string } };
    const code = body?.error?.code ?? '';
    if (res.status === 429 || code === 'rate_limited') return { ok: false, error: 'too_many_attempts' };
    if (res.status === 404 || code === 'not_found') return { ok: false, error: 'not_found' };
    return { ok: false, error: 'wrong_password' };
  }

  // D-503: the API answers `{ ok, data: SharedAccessGrant }` (was read as the grant itself: empty cookie, the page stayed locked).
  const { data: { value, expiresAt } } = (await res.json()) as { data: { value: string; expiresAt: string } };

  const cookieStore = await cookies();
  const isDev = process.env.NODE_ENV !== 'production';
  cookieStore.set(SHARE_ACCESS_COOKIE, value, {
    httpOnly: true,
    secure: !isDev,
    sameSite: 'lax',
    path: `/m/${token}`,
    expires: new Date(expiresAt),
  });

  revalidatePaths([`/m/${token}`]);
  return { ok: true };
}

type CopyResult =
  | { ok: true; boardId: string }
  | { ok: false; error: 'quota_exceeded' | 'forbidden' | 'not_found' | 'unknown' };

/** POST /v1/boards/copy — requires Supabase session. Forwards the share access cookie if present. */
export async function copyBoardAction(token: string): Promise<CopyResult> {
  if (!shareTokenSchema.safeParse(token).success) return { ok: false, error: 'not_found' };

  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token ?? null;
  if (!accessToken) {
    // Not logged in: redirect to login with `?next=/m/<token>?copiar=1`
    redirect(`/entrar?next=${encodeURIComponent(`/m/${token}?copiar=1`)}`);
  }

  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(SHARE_ACCESS_COOKIE)?.value;
  const requestId = await getRequestId();

  const reqHeaders: Record<string, string> = {
    'content-type': 'application/json',
    authorization: `Bearer ${accessToken}`,
    'x-request-id': requestId,
  };
  if (accessCookie) reqHeaders[SHARE_ACCESS_HEADER] = accessCookie;

  const body: CopyBoardInput = { token };
  const r = await apiFetch<Board>('/v1/boards/copy', null, {
    method: 'POST',
    headers: reqHeaders,
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const code = r.error.code;
    if (code === 'quota_exceeded') return { ok: false, error: 'quota_exceeded' };
    if (code === 'forbidden' || code === 'unauthorized') return { ok: false, error: 'forbidden' };
    if (code === 'not_found') return { ok: false, error: 'not_found' };
    return { ok: false, error: 'unknown' };
  }

  return { ok: true, boardId: r.data.id };
}
