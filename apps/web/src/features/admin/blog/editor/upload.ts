'use client';

// F27 T7 (D-946): POST /v1/admin/blog/images straight from the browser, because a Server Action can't report upload progress.
// Same bearer token as `api()`; the API is the gate (withAdmin, signature check, bad_image).
import { blogErrors, type BlogAsset } from '@remoa/contracts';
import { apiBase } from '@/lib/api/base';

type Body = { data?: { asset?: BlogAsset }; error?: { message?: string } } | null;
const parseBody = (text: string): Body => {
  try {
    return JSON.parse(text) as Body;
  } catch {
    return null;
  }
};

export type UploadResult = { ok: true; asset: BlogAsset } | { ok: false; code: 'bad_image' | 'error' };

export async function uploadBlogImage(file: File, slug: string, onProgress: (pct: number) => void): Promise<UploadResult> {
  const { createClient } = await import('@/lib/supabase/client');
  const { data } = await createClient().auth.getSession();
  const form = new FormData();
  form.append('file', file);
  form.append('slug', slug);
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiBase()}/v1/admin/blog/images`);
    if (data.session) xhr.setRequestHeader('authorization', `Bearer ${data.session.access_token}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onerror = () => resolve({ ok: false, code: 'error' });
    xhr.onload = () => {
      const body = parseBody(xhr.responseText);
      if (xhr.status < 300 && body?.data?.asset) resolve({ ok: true, asset: body.data.asset });
      else resolve({ ok: false, code: body?.error?.message === blogErrors.badImage ? 'bad_image' : 'error' });
    };
    xhr.send(form);
  });
}
