import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo/site';

// G11 (D-361): '/app' as a bare prefix also blocked /apple-icon.png; '/app$' + '/app/' block only the logged-in area.
// /m/<token> is NOT disallowed on purpose: crawlers must fetch it to see its noindex.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/app/', '/app$'] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
