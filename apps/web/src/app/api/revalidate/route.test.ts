// F27 T11 (qa): the revalidate endpoint refuses everything without the exact Bearer, and with no secret configured.
import { afterEach, describe, expect, it, vi } from 'vitest';

const revalidateTag = vi.fn();
const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag: (t: string) => revalidateTag(t), revalidatePath: (p: string) => revalidatePath(p) }));
const { POST } = await import('./route');

const SECRET = 's'.repeat(40);
const req = (auth: string | null, body: unknown = { tags: ['blog'] }) =>
  new Request('http://x/api/revalidate', { method: 'POST', headers: auth === null ? {} : { authorization: auth }, body: JSON.stringify(body) });

describe('POST /api/revalidate', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    revalidateTag.mockClear();
  });

  it('401 without a configured secret, even with an empty or matching-looking header', async () => {
    vi.stubEnv('REVALIDATE_SECRET', '');
    for (const a of [null, '', 'Bearer ', 'Bearer undefined']) expect((await POST(req(a))).status).toBe(401);
    vi.stubEnv('REVALIDATE_SECRET', 'short');
    expect((await POST(req('Bearer short'))).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('401 on a wrong or prefix bearer; 422 on a bad body; 200 drops the tags', async () => {
    vi.stubEnv('REVALIDATE_SECRET', SECRET);
    for (const a of [`Bearer ${SECRET.slice(0, -1)}`, `Bearer ${SECRET}x`, SECRET, `bearer ${SECRET}`]) expect((await POST(req(a))).status).toBe(401);
    expect((await POST(req(`Bearer ${SECRET}`, { tags: [] }))).status).toBe(422);
    expect((await POST(req(`Bearer ${SECRET}`, { tags: ['blog'], paths: ['https://evil.example'] }))).status).toBe(422);
    expect(revalidateTag).not.toHaveBeenCalled();
    expect((await POST(req(`Bearer ${SECRET}`, { tags: ['blog', 'blog:post:x'] }))).status).toBe(200);
    expect(revalidateTag.mock.calls.map((c) => c[0])).toEqual(['blog', 'blog:post:x']);
  });
});
