// F27 FR-21/FR-33 (D-907): the API drops the blog's tag cache after publish/unpublish/slug change/scheduled publish/sitemap change.
import { createHash, timingSafeEqual } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { revalidateInputSchema } from '@remoa/contracts';
import { revalidateSecret } from '@/lib/env/legal';

const digest = (s: string) => createHash('sha256').update(s).digest();
const error = (status: number, code: string, message: string) => Response.json({ error: { code, message } }, { status });

export async function POST(req: Request) {
  const secret = revalidateSecret();
  // Digests first: equal length, so the comparison is constant-time whatever the header holds. No secret = refuse everything.
  if (!secret || !timingSafeEqual(digest(req.headers.get('authorization') ?? ''), digest(`Bearer ${secret}`))) return error(401, 'unauthorized', 'invalid revalidate secret');
  const body = revalidateInputSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return error(422, 'validation', 'invalid body');
  for (const tag of body.data.tags) revalidateTag(tag);
  for (const path of body.data.paths ?? []) revalidatePath(path);
  return Response.json({ ok: true, data: { tags: body.data.tags.length, paths: body.data.paths?.length ?? 0 } });
}
