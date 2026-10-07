import type { MetadataRoute } from 'next';
import { z } from 'zod';
import { sitemapEntrySchema, type SitemapEntry } from '@remoa/contracts';
import { apiBase } from '@/lib/api/base';
import { buildSitemap } from '@/lib/seo/sitemap';
import { siteUrl } from '@/lib/seo/site';
import { getPublicSeeds } from '@/features/library/public-api';

// Revalidated on demand by the `sitemap` tag (D-907); hourly so a build made while the API was down recovers soon.
export const revalidate = 3600;

async function blogEntries(): Promise<SitemapEntry[]> {
  try {
    const res = await fetch(`${apiBase()}/v1/public/blog/sitemap`, { next: { tags: ['sitemap'], revalidate: 86_400 } });
    if (!res.ok) return [];
    return z.object({ data: z.array(sitemapEntrySchema) }).parse(await res.json()).data;
  } catch {
    return []; // API down = static pages only, never a 500
  }
}

async function seedEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const seeds = (await getPublicSeeds()).filter((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.slug));
    return [{ url: `${siteUrl}/mapas-prontos` }, ...seeds.map((s) => ({ url: `${siteUrl}/mapas-prontos/${s.slug}` }))];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [...buildSitemap(await blogEntries()), ...(await seedEntries())];
}
