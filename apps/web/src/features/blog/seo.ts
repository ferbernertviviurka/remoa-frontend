import type { Metadata } from 'next';
import type { BlogCategory, BlogPublicPost } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { siteUrl } from '@/lib/seo/site';

const abs = (path: string) => `${siteUrl}${path}`;
const iso = (d: Date | string) => new Date(d).toISOString();
const brand = () => t('landing.seo.orgName');

type Ld = Record<string, unknown>;

export const postPath = (slug: string) => `/blog/${slug}`;

/** FR-21 to FR-25: title, description, canonical, robots, Open Graph (article) and Twitter card. Preview is noindex + nofollow (FR-16). */
export function postMetadata(post: BlogPublicPost): Metadata {
  const title = post.seoTitle ?? `${post.title} | ${brand()}`;
  const canonical = post.canonicalUrl ?? abs(postPath(post.slug));
  const image = post.cover ? { url: post.cover.ogUrl ?? post.cover.url, width: 1200, height: 630, alt: post.coverAlt } : null;
  return {
    title: { absolute: title },
    description: post.description,
    alternates: { canonical },
    robots: post.preview ? { index: false, follow: false } : post.robots === 'noindex' ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: 'article', url: canonical, title, description: post.description, siteName: brand(), locale: 'pt_BR',
      ...(post.publishedAt ? { publishedTime: iso(post.publishedAt) } : {}),
      modifiedTime: iso(post.contentUpdatedAt),
      ...(post.category ? { section: post.category.name } : {}),
      ...(image ? { images: [image] } : {}),
    },
    twitter: { card: 'summary_large_image', title, description: post.description, ...(image ? { images: [image.url] } : {}) },
  };
}

type ListMeta = { title: string; description: string; path: string; noindex?: boolean };
export const listMetadata = ({ title, description, path, noindex }: ListMeta): Metadata => ({
  title: { absolute: title },
  description,
  alternates: { canonical: abs(path) },
  robots: noindex ? { index: false, follow: true } : { index: true, follow: true },
  openGraph: { type: 'website', url: abs(path), title, description, siteName: brand(), locale: 'pt_BR' },
  twitter: { card: 'summary_large_image', title, description },
});

export const categoryMetadata = (c: BlogCategory): Metadata =>
  listMetadata({
    title: t('blog.pages.category.seoTitle', { name: c.name }),
    description: !c.introDraft && c.intro ? c.intro : t('blog.pages.category.seoDescription', { name: c.name }),
    path: `/blog/categoria/${c.slug}`,
  });

export const crumbsLd = (items: { name: string; path: string }[]): Ld => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
});

export const postBreadcrumbs = (post: BlogPublicPost) => [
  { name: t('blog.pages.post.breadcrumb.home'), path: '/' },
  { name: t('blog.pages.post.breadcrumb.blog'), path: '/blog' },
  ...(post.category ? [{ name: post.category.name, path: `/blog/categoria/${post.category.slug}` }] : []),
  { name: post.title, path: postPath(post.slug) },
];

/** FR-30. No personal data: author is the editorial name only. */
export const blogPostingLd = (post: BlogPublicPost): Ld => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  description: post.description,
  inLanguage: 'pt-BR',
  mainEntityOfPage: post.canonicalUrl ?? abs(postPath(post.slug)),
  ...(post.cover ? { image: [post.cover.ogUrl ?? post.cover.url] } : {}),
  ...(post.publishedAt ? { datePublished: iso(post.publishedAt) } : {}),
  dateModified: iso(post.contentUpdatedAt),
  ...(post.category ? { articleSection: post.category.name } : {}),
  wordCount: post.wordCount,
  author: { '@type': 'Organization', name: post.author?.name ?? t('blog.pages.post.teamName') },
  publisher: { '@type': 'Organization', name: brand(), logo: { '@type': 'ImageObject', url: abs('/icon.svg') } },
});
