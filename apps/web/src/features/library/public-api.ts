import { apiBase } from '@/lib/api/base';
import { noStore } from '@/lib/cache';
import type { PublicSeed, PublicSeedDetail } from './public-seeds';

// Server-only by use. ISR: the API caches 60 s; here 1 h with a tag (no event reaches the web yet, see report).
async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(`${apiBase()}/v1/public/mapas-prontos${path}`, { next: { revalidate: 3600, tags: ['mapas-prontos'] } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`mapas-prontos: API ${res.status}`);
  return ((await res.json()) as { data: T }).data;
}

/**
 * List for `/mapas-prontos`. A down API during `next build` used to fail the Vercel prerender.
 * At build time the page ships empty and uncached; at runtime the throw keeps the last good ISR page (D-968).
 */
export async function loadPublicSeeds(): Promise<PublicSeed[]> {
  try {
    return (await get<PublicSeed[]>('')) ?? [];
  } catch (error) {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      noStore();
      return [];
    }
    throw error;
  }
}

export const getPublicSeeds = async () => (await get<PublicSeed[]>('')) ?? [];
export const getPublicSeed = (slug: string) => get<PublicSeedDetail>(`/${encodeURIComponent(slug)}`);
