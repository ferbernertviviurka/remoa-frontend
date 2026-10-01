// FR-3: image upload sign → presigned PUT (XHR for progress) → complete. Plus a per-asset cache of signed GET urls.
import { useEffect, useState } from 'react';
import { imageMimes, type AssetLicense, type AssetRef, type AssetView, type ErrorCode, type Result } from '@remoa/contracts';
import { api } from '@/lib/api';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type FileProblem = 'badType' | 'tooBig';
/** Checked before anything is sent. */
export function checkFile(f: Pick<File, 'type' | 'size'>): FileProblem | null {
  if (!(imageMimes as readonly string[]).includes(f.type)) return 'badType';
  return f.size > MAX_IMAGE_BYTES ? 'tooBig' : null;
}

/** PUT to the presigned URL with the signed Content-Type; the browser sets Content-Length. */
export function putFile(url: string, file: File, onProgress: (pct: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.onabort = () => resolve(false);
    xhr.send(file);
  });
}

const fail = (code: ErrorCode = 'internal'): Result<never> => ({ ok: false, error: { code, message: 'upload failed' } });

export async function uploadImage(
  file: File,
  meta: { license: AssetLicense; attribution: string | null },
  onProgress: (pct: number) => void,
): Promise<Result<AssetRef>> {
  try {
    const sign = await api<{ url: string; key: string }>('/v1/uploads/sign', {
      method: 'POST',
      body: JSON.stringify({ mime: file.type, sizeBytes: file.size }),
    });
    if (!sign.ok) return sign;
    if (!(await putFile(sign.data.url, file, onProgress))) return fail();
    return await api<AssetRef>('/v1/uploads/complete', { method: 'POST', body: JSON.stringify({ key: sign.data.key, ...meta }) });
  } catch {
    return fail(); // network down
  }
}

// --- signed GET urls, one request per asset (map cards share it) -------------------
const TTL_MS = 50 * 60 * 1000; // signed urls last ~1 h
const assets = new Map<string, { at: number; view: Promise<AssetView | null> }>();

export function loadAsset(id: string): Promise<AssetView | null> {
  const hit = assets.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.view;
  const view = api<AssetView>(`/v1/assets/${id}`)
    .then((r) => (r.ok ? r.data : null))
    .catch(() => null)
    .then((v) => {
      if (!v) assets.delete(id); // failures are retried on the next mount
      return v;
    });
  assets.set(id, { at: Date.now(), view });
  return view;
}

/** Test helper. */
export const clearAssetCache = () => assets.clear();

export function useAsset(id: string | null | undefined): AssetView | null {
  const [view, setView] = useState<{ id: string; v: AssetView | null } | null>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    void loadAsset(id).then((v) => live && setView({ id, v }));
    return () => {
      live = false;
    };
  }, [id]);
  return id && view?.id === id ? view.v : null;
}
