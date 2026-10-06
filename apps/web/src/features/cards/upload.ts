// FR-3 / D-1202: image upload as multipart to the API (XHR for progress), which compresses to WebP. Plus a per-asset cache of signed GET urls.
import { useEffect, useState } from 'react';
import { IMAGE_MAX_BYTES, httpErrorBodySchema, imageMimes, type AssetLicense, type AssetRef, type AssetView, type ErrorCode, type Result } from '@remoa/contracts';
import { api, apiBase, sessionToken } from '@/lib/api';

export const MAX_IMAGE_BYTES = IMAGE_MAX_BYTES;

export type FileProblem = 'badType' | 'tooBig';
/** Checked before anything is sent. */
export function checkFile(f: Pick<File, 'type' | 'size'>): FileProblem | null {
  if (!(imageMimes as readonly string[]).includes(f.type)) return 'badType';
  return f.size > MAX_IMAGE_BYTES ? 'tooBig' : null;
}

const fail = (code: ErrorCode = 'internal'): Result<never> => ({ ok: false, error: { code, message: 'upload failed' } });

/** POST a body (multipart or a raw file) to the API with the session token; XHR (not fetch) for upload progress. 413 = over the route's cap. */
export function postUpload<T>(path: string, token: string | null, body: FormData | Blob, onProgress: (pct: number) => void): Promise<Result<T>> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiBase()}${path}`);
    if (token) xhr.setRequestHeader('authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON (proxy error page) */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body) return resolve(body as Result<T>);
      const parsed = httpErrorBodySchema.safeParse(body);
      resolve(parsed.success ? { ok: false, error: parsed.data.error } : fail(xhr.status === 413 ? 'validation' : 'internal'));
    };
    xhr.onerror = () => resolve(fail());
    xhr.onabort = () => resolve(fail());
    xhr.send(body);
  });
}

export async function uploadImage(
  file: File,
  meta: { license: AssetLicense; attribution: string | null },
  onProgress: (pct: number) => void,
): Promise<Result<AssetRef>> {
  try {
    const form = new FormData();
    form.append('file', file);
    form.append('license', meta.license);
    if (meta.attribution) form.append('attribution', meta.attribution);
    return await postUpload<AssetRef>('/v1/uploads/direct', await sessionToken(), form, onProgress);
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

/** Several assets at once (flow steps, case stages): id → view (null while loading or on failure). */
export function useAssets(ids: readonly (string | null | undefined)[]): ReadonlyMap<string, AssetView | null> {
  const key = [...new Set(ids.filter((x): x is string => !!x))].sort().join(',');
  const [views, setViews] = useState<{ key: string; map: ReadonlyMap<string, AssetView | null> }>({ key: '', map: new Map() });
  useEffect(() => {
    if (!key) return;
    let live = true;
    const list = key.split(',');
    void Promise.all(list.map(loadAsset)).then((vs) => live && setViews({ key, map: new Map(list.map((id, i) => [id, vs[i] ?? null])) }));
    return () => {
      live = false;
    };
  }, [key]);
  return views.key === key ? views.map : empty;
}
const empty: ReadonlyMap<string, AssetView | null> = new Map();

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
