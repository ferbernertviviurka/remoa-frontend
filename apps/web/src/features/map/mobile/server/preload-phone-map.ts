import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { preload } from 'react-dom';

/** A phone browser (the viewport still decides on the client: a phone UA on a wide window gets the desktop canvas). */
export const isPhoneUA = (ua: string | null) => /Mobi|Android|iPhone/i.test(ua ?? '');

const KEY = 'lazy-mobile-map.tsx -> ./mobile-map';
let files: string[] | null | undefined;

/** Files of the phone map's lazy chunk, from Next's build manifest (null when it is missing, e.g. a test). Read once. */
export function phoneMapFiles(read: (path: string) => string = (p) => readFileSync(p, 'utf8')): string[] | null {
  if (files !== undefined) return files;
  try {
    const manifest = JSON.parse(read(join(process.cwd(), process.env.NEXT_DIST_DIR ?? '.next', 'react-loadable-manifest.json'))) as Record<string, { files?: string[] }>;
    const entry = Object.entries(manifest).find(([k]) => k.endsWith(KEY))?.[1];
    files = entry?.files ?? null;
  } catch {
    files = null;
  }
  return files;
}

/**
 * P-293 (D-706): on a phone the map page's HTML preloads the lazy phone-map chunk (React Flow + the canvas), so it downloads
 * in parallel with the page's scripts instead of after hydration + `matchMedia` + `import()`. Desktops get nothing. Without the
 * manifest it does nothing (the module-level `import()` in `lazy-mobile-map.tsx` still starts the fetch early).
 */
export function preloadPhoneMap(ua: string | null) {
  if (!isPhoneUA(ua)) return;
  for (const f of phoneMapFiles() ?? []) preload(`/_next/${f}`, { as: f.endsWith('.css') ? 'style' : 'script', fetchPriority: 'low' }); // low: like the page's async scripts, never ahead of them
}

/** test seam */
export const resetPhoneMapFiles = () => {
  files = undefined;
};
