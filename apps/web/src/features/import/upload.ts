// D-1443: the .apkg goes to the API (raw body, streamed to storage there), never straight to the bucket: no storage CORS involved.
import type { Result } from '@remoa/contracts';
import { sessionToken } from '@/lib/api';
import { postUpload } from '@/features/cards/upload';

/** POST of the .apkg to /v1/imports/anki/direct (XHR for progress). Errors: `quota_exceeded` 'anki' (D-648), 413/422 `validation`, network `internal`. */
export async function uploadApkg(file: File, onProgress: (pct: number) => void): Promise<Result<{ key: string }>> {
  try {
    return await postUpload<{ key: string }>('/v1/imports/anki/direct', await sessionToken(), file, onProgress);
  } catch {
    return { ok: false, error: { code: 'internal', message: 'upload failed' } };
  }
}
