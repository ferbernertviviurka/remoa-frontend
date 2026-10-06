import type { BlogCategory, BlogListItem, BlogPublicPost } from '@remoa/contracts';
import { t } from '@remoa/strings';
import {
  ArticleBody, AuthorBox, BlogCategoryChips, BlogGrid, BlogIndexHeader, BlogSearch, Breadcrumbs, EducationalNotice, Pagination,
  PostCard, PostCta, PostHero, PostLayout, QuickSummary, RelatedPosts, Toc, blogStagger,
} from '@remoa/ui';
import { JsonLd, faqPageLd } from '@/lib/seo/json-ld';
import { toLandingPost } from '@/features/landing/blog/latest-posts';
import { BLOG_PAGE_SIZE } from './api';
import { blogPostingLd, crumbsLd, postBreadcrumbs } from './seo';
import { BlogCtaTrack, BlogPostViewed, BlogSearchUsed } from './track';

const longDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
const SIGNUP = '/cadastro';

export const cardProps = (p: BlogListItem) => {
  const c = toLandingPost(p);
  return { ...c, dateTime: new Date(p.publishedAt ?? p.updatedAt).toISOString(), cover: { ...c.cover, sizes: '(min-width: 768px) 380px, 100vw' } };
};

export const totalPages = (total: number, size = BLOG_PAGE_SIZE) => Math.max(1, Math.ceil(total / size));

/** Page 1 lives at /blog (one URL per page, FR-15); `q` rides on the query string. */
export const pageHref = (n: number, q?: string) => {
  const base = n <= 1 ? '/blog' : `/blog/pagina/${n}`;
  return q ? `${base}?${new URLSearchParams({ q })}` : base;
};

export function PostGrid({ items, firstPriority }: { items: BlogListItem[]; firstPriority?: boolean }) {
  return (
    <BlogGrid>
      {items.map((p, i) => <PostCard key={p.id} {...cardProps(p)} headingLevel={2} priority={firstPriority && i === 0} delay={blogStagger(i)} />)}
    </BlogGrid>
  );
}

export function IndexView({ items, total, page, categories, q }: { items: BlogListItem[]; total: number; page: number; categories: BlogCategory[]; q?: string }) {
  const pages = totalPages(total);
  const [feature, ...rest] = page === 1 && !q ? items : [undefined, ...items];
  return (
    <>
      <BlogIndexHeader eyebrow={t('blog.pages.index.eyebrow')} title={t('blog.pages.index.title')} lead={t('blog.pages.index.lead')}>
        <BlogSearch action="/blog" label={t('blog.pages.index.searchLabel')} placeholder={t('blog.pages.index.searchPlaceholder')} submitLabel={t('blog.pages.index.searchSubmit')} defaultValue={q} />
        <BlogCategoryChips
          label={t('blog.pages.index.categoriesLabel')}
          items={[
            { label: t('blog.pages.index.allCategories'), count: categories.reduce((s, c) => s + c.postCount, 0), href: '/blog', active: true },
            ...categories.filter((c) => c.postCount > 0).map((c) => ({ label: c.name, count: c.postCount, href: `/blog/categoria/${c.slug}` })),
          ]}
        />
      </BlogIndexHeader>
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-10 md:py-14">
        {q ? <BlogSearchUsed resultCount={total} queryLength={q.length} /> : null}
        {items.length === 0 ? (
          <p role="status" className="m-0 text-center text-lg text-muted">{q ? t('blog.pages.index.noResults.title') + '. ' + t('blog.pages.index.noResults.body') : t('blog.pages.index.noPosts.body')}</p>
        ) : (
          <>
            {feature ? (
              <div className="mb-8">
                <PostCard {...cardProps(feature)} variant="feature" headingLevel={2} priority />
              </div>
            ) : null}
            <PostGrid items={rest.filter((p): p is BlogListItem => !!p)} firstPriority={!feature} />
          </>
        )}
        {pages > 1 ? (
          <Pagination
            label={t('blog.pages.index.paginationLabel')}
            prevLabel={t('blog.pages.index.prev')}
            nextLabel={t('blog.pages.index.next')}
            prevHref={page > 1 ? pageHref(page - 1, q) : null}
            nextHref={page < pages ? pageHref(page + 1, q) : null}
            pages={Array.from({ length: pages }, (_, i) => ({ number: i + 1, href: pageHref(i + 1, q), label: t('blog.pages.index.pagination', { n: i + 1 }), current: i + 1 === page }))}
          />
        ) : null}
      </div>
      <PostCta variant="band" title={t('blog.pages.cta.title')} text={t('blog.pages.cta.text')} label={t('blog.pages.cta.label')} href={SIGNUP} />
    </>
  );
}

export function CategoryView({ category, items }: { category: BlogCategory; items: BlogListItem[] }) {
  return (
    <>
      <JsonLd data={crumbsLd([
        { name: t('blog.pages.post.breadcrumb.home'), path: '/' },
        { name: t('blog.pages.post.breadcrumb.blog'), path: '/blog' },
        { name: category.name, path: `/blog/categoria/${category.slug}` },
      ])} />
      <BlogIndexHeader eyebrow={t('blog.pages.index.eyebrow')} title={category.name} lead={!category.introDraft && category.intro ? category.intro : undefined}>
        <Breadcrumbs label={t('blog.pages.post.breadcrumbLabel')} items={[
          { label: t('blog.pages.post.breadcrumb.blog'), href: '/blog' },
          { label: category.name },
        ]} />
      </BlogIndexHeader>
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-10 md:py-14">
        {items.length === 0 ? <p role="status" className="m-0 text-center text-lg text-muted">{t('blog.pages.category.empty')}</p> : <PostGrid items={items} firstPriority />}
      </div>
      <PostCta variant="band" title={t('blog.pages.cta.title')} text={t('blog.pages.cta.text')} label={t('blog.pages.cta.label')} href={SIGNUP} />
    </>
  );
}

export function PostView({ post }: { post: BlogPublicPost }) {
  const { template } = post;
  const when = post.publishedAt ?? post.contentUpdatedAt;
  const reading = t('blog.pages.post.readingTime', { n: post.readingMinutes });
  const cover = post.cover
    ? { src: post.cover.url, srcSet: post.cover.srcset.webp, sizes: '(min-width: 1200px) 960px, 100vw', alt: post.coverAlt, width: post.cover.width, height: post.cover.height }
    : { src: '/icon.svg', alt: '', width: 1200, height: 630 };
  const tocItems = post.toc.map((e) => ({ id: e.id, title: e.text, level: e.level }));
  const tocTitle = template === 'guia' ? t('blog.pages.post.inThisGuide') : t('blog.pages.post.inThisArticle');
  const toc = tocItems.length > 1 && template !== 'destaque'
    ? <Toc label={t('blog.pages.post.tocLabel')} title={tocTitle} items={tocItems} variant={template === 'guia' ? 'side' : 'inline'} toggleLabel={tocTitle} />
    : null;
  const cta = (variant: 'light' | 'dark' | 'band') => (
    <BlogCtaTrack slug={post.slug} position="end">
      <PostCta variant={variant} title={t('blog.pages.cta.title')} text={t('blog.pages.cta.text')} label={t('blog.pages.cta.label')} href={SIGNUP} />
    </BlogCtaTrack>
  );
  const body = (
    <>
      {template === 'guia' ? <QuickSummary title={t('blog.pages.post.quickSummary')} items={tocItems.filter((e) => e.level === 2).map((e) => e.title)} /> : null}
      <ArticleBody html={post.html} template={template} />
      <EducationalNotice text={t('blog.pages.post.educationalWarning')} />
      <AuthorBox name={post.author?.name ?? t('blog.pages.post.teamName')} bio={t('blog.pages.post.authorBio')} />
      {template === 'guia' ? null : cta(template === 'destaque' ? 'dark' : 'light')}
    </>
  );
  return (
    <>
      <JsonLd data={blogPostingLd(post)} />
      <JsonLd data={crumbsLd(postBreadcrumbs(post))} />
      {post.faq.length ? <JsonLd data={faqPageLd(post.faq.map((f) => ({ q: f.q, a: f.a })))} /> : null}
      {post.preview ? <EducationalNotice text={`${t('blog.pages.post.preview.label')}. ${t('blog.pages.post.preview.expiring')}`} /> : <BlogPostViewed slug={post.slug} template={template} category={post.category?.slug} />}
      <PostHero
        template={template}
        breadcrumbs={{ label: t('blog.pages.post.breadcrumbLabel'), items: [{ label: t('blog.pages.post.breadcrumb.blog'), href: '/blog' }, { label: post.category?.name ?? post.title }] }}
        category={post.category?.name ?? t('blog.navigation.blog')}
        badge={template === 'destaque' ? reading : undefined}
        title={post.title}
        description={post.description}
        author={post.author?.name ?? t('blog.pages.post.teamName')}
        dateTime={new Date(when).toISOString()}
        meta={`${longDate.format(new Date(when))} · ${reading}`}
        cover={cover}
      />
      <PostLayout layout={template === 'guia' ? 'guide' : template === 'destaque' ? 'narrow' : 'single'} aside={toc ?? undefined}>{body}</PostLayout>
      {template === 'guia' ? cta('band') : null}
      <div className="px-5 pb-20 md:px-10">
        <RelatedPosts title={t('blog.pages.post.relatedPosts')} posts={post.related.slice(0, 3).map(cardProps)} />
      </div>
    </>
  );
}
