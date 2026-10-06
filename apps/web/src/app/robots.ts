import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo/site';

// G11 (D-361): '/app' as a bare prefix also blocked /apple-icon.png; '/app$' + '/app/' block only the logged-in area.
// /m/<token> is NOT disallowed on purpose: crawlers must fetch it to see its noindex.
// F27 FR-35: admin, API, auth screens and blog previews are blocked. '/blog/preview/' keeps the slash so a post named "preview" stays crawlable.
const DISALLOW = [
  '/api/', '/app/', '/app$', '/admin', '/auth/', '/entrar', '/cadastro', '/confirmar-email', '/recuperar-senha', '/redefinir-senha',
  '/blog/preview/', '/preview/', '/dev/',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: DISALLOW },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
