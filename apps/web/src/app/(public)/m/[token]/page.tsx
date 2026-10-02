// F17 T7 (FR-13, FR-14): public share page `/m/[token]`.
// ALWAYS `noindex`. NEVER the board title in <title> or metadata.
// Server Component: reads cookie, calls API, renders locked/unlocked/404.
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { SHARE_ACCESS_COOKIE, SHARE_ACCESS_HEADER, shareTokenSchema, type SharedBoardResponse } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { serverApi } from '@/lib/api/server';
import { UnlockForm } from './unlock-form';
import { SharedBoardView } from './shared-board-view';
import { deleteCookieAction } from './actions';

export const metadata: Metadata = {
  title: t('sharedMap.metaTitle'),
  description: t('sharedMap.metaDescription'),
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

export default async function SharedBoardPage({ params }: Props) {
  const { token } = await params;

  // Validate token format before hitting the API (D-311)
  if (!shareTokenSchema.safeParse(token).success) notFound();

  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(SHARE_ACCESS_COOKIE)?.value;

  const extraHeaders: Record<string, string> = {};
  if (accessCookie) extraHeaders[SHARE_ACCESS_HEADER] = accessCookie;

  const r = await serverApi<SharedBoardResponse>(`/v1/public/shared/${token}`, {
    method: 'GET',
    headers: extraHeaders,
  });

  // 404: unknown/rotated/archived/owner-only token
  if (!r.ok) {
    if (r.error.code === 'not_found') notFound();
    notFound(); // rate_limited or server error → treat as not found
  }

  const board = r.data;

  // D-311: if we sent a cookie and the response is still locked, delete the stale cookie
  if (board.locked && accessCookie) {
    await deleteCookieAction(token);
  }

  if (board.locked) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <UnlockForm token={token} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <SharedBoardView board={board} token={token} />
    </main>
  );
}
