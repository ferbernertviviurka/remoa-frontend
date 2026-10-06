'use server';

// F27 T7: reads the editor needs from the client (the rest is in ../api.ts, T6).
import type { BlogRevision, Result } from '@remoa/contracts';
import { adminGet } from '../../shared/api';

const mocked = () => process.env.ADMIN_MOCKS === '1' && process.env.NODE_ENV !== 'production';

/** GET /v1/admin/blog/posts/:id/revisions (FR-11, last 20). */
export async function listRevisions(id: string): Promise<Result<BlogRevision[]>> {
  return mocked() ? { ok: true, data: [] } : adminGet<BlogRevision[]>(`/blog/posts/${encodeURIComponent(id)}/revisions`);
}
