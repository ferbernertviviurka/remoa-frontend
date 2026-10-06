import type { BlogListItem } from '@remoa/contracts';
import { t } from '@remoa/strings';

// Brackets and line breaks would break the `- [title](url): note` lines of the format.
const inline = (s: string) => s.replace(/[\r\n]+/g, ' ').replace(/\[/g, '(').replace(/\]/g, ')').trim();
const link = (title: string, url: string, note?: string) => `- [${inline(title)}](${url})${note ? `: ${inline(note)}` : ''}`;

/** /llms.txt (llmstxt.org): H1, summary blockquote, details, then H2 lists of links. "Optional" is the section a reader may skip. */
export function buildLlmsTxt(posts: BlogListItem[], { origin }: { origin: string }): string {
  return [
    `# ${t('landing.seo.orgName')}`,
    '',
    `> ${t('landing.seo.llms.summary')}`,
    '',
    t('landing.seo.llms.details'),
    '',
    `## ${t('landing.seo.llms.pages')}`,
    '',
    link(t('landing.seo.title'), `${origin}/`, t('landing.seo.description')),
    link(t('landing.seo.llms.blogIndex'), `${origin}/blog`, t('blog.pages.index.seoDescription')),
    link(t('legal.terms.pageTitle'), `${origin}/termos-de-uso`, t('legal.terms.description')),
    link(t('legal.privacy.pageTitle'), `${origin}/politica-de-privacidade`, t('legal.privacy.description')),
    ...(posts.length ? ['', `## ${t('landing.seo.llms.blog')}`, '', ...posts.map((p) => link(p.title, `${origin}/blog/${p.slug}`, p.excerpt || p.description))] : []),
    '',
    `## ${t('landing.seo.llms.optional')}`,
    '',
    link(t('landing.seo.llms.feed'), `${origin}/feed.xml`, t('landing.seo.llms.feedDescription')),
    link(t('landing.seo.llms.sitemap'), `${origin}/sitemap.xml`, t('landing.seo.llms.sitemapDescription')),
    '',
  ].join('\n');
}
