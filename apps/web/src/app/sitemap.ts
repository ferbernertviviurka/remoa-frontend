import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteUrl }, { url: `${siteUrl}/planos` }];
}
