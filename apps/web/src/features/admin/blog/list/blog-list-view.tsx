'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { blogStatuses, SITEMAP_STATIC_PATHS, type AdminSitemap, type BlogAdminList, type BlogListItem } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { AdminHeader, AdminSearch, BlogPostList, BlogPostRow, BlogStatusTabs, Button, ReasonDialog, SitemapCard, useToast } from '@remoa/ui';
import { useListParams } from '../../list-kit/use-list-params';
import { blogAction } from '../api';
import { formatDateTime, formatDay } from './format';
import { NewPostDialog } from './new-post-dialog';

type Filter = 'all' | (typeof blogStatuses)[number];

// Neutral 76 x 48 tile for posts without a cover (the row image is decorative, alt="").
const NO_COVER = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="76" height="48"><rect width="76" height="48" fill="#EEEAFB"/></svg>')}`;

const dateOf = (p: BlogListItem) => formatDay((p.status === 'scheduled' ? p.publishAt : p.status === 'published' ? p.publishedAt : null) ?? p.updatedAt);

function SitemapSection({ sitemap, error }: { sitemap: AdminSitemap | null; error: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  if (!sitemap) return error ? <p role="alert" className="m-0 text-[13.5px] font-semibold text-review-text">{t('adminBlog.sitemap.loadError')}</p> : null;
  const { status, entries } = sitemap;
  const when = status.lastGeneratedAt ?? status.nextRunAt;
  const urls = [
    ...SITEMAP_STATIC_PATHS.map((path) => ({ path, type: t(path === '/' ? 'adminBlog.sitemap.types.home' : path === '/blog' ? 'adminBlog.sitemap.types.blog' : 'adminBlog.sitemap.types.legal'), lastmod: formatDay(when) })),
    ...entries.map((e) => ({ path: e.path, type: t(`adminBlog.sitemap.types.${e.kind}`), lastmod: formatDay(e.lastmod) })),
  ];
  async function refresh() {
    const r = await blogAction('/sitemap/regenerate');
    if (!r.ok) return toast({ title: t('adminBlog.sitemap.refreshError'), tone: 'danger' });
    toast({ title: t('adminBlog.sitemap.toast') });
    router.refresh();
  }
  return (
    <SitemapCard
      title={t('adminBlog.sitemap.title', { count: status.urlCount })}
      description={t('adminBlog.sitemap.lastUpdated', { date: status.lastGeneratedAt ? formatDateTime(status.lastGeneratedAt) : t('adminBlog.sitemap.neverGenerated') })}
      urls={urls}
      columns={{ path: t('adminBlog.sitemap.urlColumns.address'), type: t('adminBlog.sitemap.urlColumns.type'), lastmod: t('adminBlog.sitemap.urlColumns.lastmod') }}
      showUrlsLabel={t('adminBlog.sitemap.viewUrls')}
      hideUrlsLabel={t('adminBlog.sitemap.hideUrls')}
      sitemapHref="/sitemap.xml"
      sitemapLabel={t('adminBlog.sitemap.sitemapLink')}
      refreshLabel={t('adminBlog.sitemap.regenerateButton')}
      onRefresh={refresh}
    />
  );
}

export function BlogListView({ data, error, sitemap, sitemapError = false, status, page }: { data: BlogAdminList | null; error: string | null; sitemap: AdminSitemap | null; sitemapError?: boolean; status: Filter; page: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const url = useListParams();
  const [creating, setCreating] = useState(false);
  const [unpublishing, setUnpublishing] = useState<BlogListItem | null>(null);
  const [reauth, setReauth] = useState(false);

  const counts = data?.counts;
  const summary = blogStatuses.map((s) => ({ status: s, label: t(`adminBlog.list.summary.${s}`), count: counts?.[s] ?? 0 }));
  const filters = (['all', ...blogStatuses] as const).map((key) => ({ key, label: t(`adminBlog.list.filters.${key}`) }));
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  async function duplicate(p: BlogListItem) {
    const r = await blogAction<{ post: { id: string } }>(`/posts/${p.id}/duplicate`);
    if (!r.ok) return toast({ title: t('adminBlog.list.duplicateError'), tone: 'danger' });
    toast({ title: t('adminBlog.messages.duplicated') });
    router.push(`/admin/blog/${r.data.post.id}`);
  }

  async function unpublish(reason: string) {
    const r = await blogAction(`/posts/${unpublishing!.id}/unpublish`, { reason });
    setReauth(!r.ok && r.error.code === 'reauth_required');
    if (!r.ok) throw new Error(r.error.code);
    return { auditId: r.auditId };
  }

  return (
    <>
      <AdminHeader title={t('adminBlog.header.title')} subtitle={t('adminBlog.header.subtitle', { count: counts?.all ?? 0 })}>
        <AdminSearch label={t('adminBlog.list.searchPlaceholder')} placeholder={t('adminBlog.list.searchPlaceholder')} value={url.q} onValueChange={url.setQ} />
        <Button onClick={() => setCreating(true)}>{t('adminBlog.list.newPostButton')}</Button>
      </AdminHeader>
      <div className="flex flex-col gap-[22px] px-4 py-6 md:px-10 md:py-7">
        <SitemapSection sitemap={sitemap} error={sitemapError} />
        {error || !data ? (
          <div role="alert" className="flex items-center gap-3 text-muted">
            {t('adminBlog.list.loadError')}
            <Button variant="secondary" onClick={url.refresh}>{t('adminBlog.list.retry')}</Button>
          </div>
        ) : (
          <>
            <BlogStatusTabs summary={summary} filtersLabel={t('adminBlog.list.filtersLabel')} filters={filters} value={status} onChange={(k) => url.push({ status: k })} />
            <BlogPostList
              label={t('adminBlog.list.ariaLabel')}
              columns={{ post: t('adminBlog.list.columns.post'), category: t('adminBlog.list.columns.category'), template: t('adminBlog.list.columns.template'), status: t('adminBlog.list.columns.status'), date: t('adminBlog.list.columns.date'), actions: t('adminBlog.list.columns.actions') }}
              empty={t(counts?.all ? 'adminBlog.list.noResults' : 'adminBlog.empty.title')}
              isEmpty={data.items.length === 0}
            >
              {data.items.map((p, i) => (
                <BlogPostRow
                  key={p.id}
                  coverSrc={p.cover?.url ?? NO_COVER}
                  title={p.title}
                  slug={p.slug}
                  category={p.category?.name ?? '—'}
                  templateLabel={t(`adminBlog.newPost.templates.${p.template}.name`)}
                  status={p.status}
                  statusLabel={t(`adminBlog.list.statuses.${p.status}`)}
                  date={dateOf(p)}
                  editHref={`/admin/blog/${p.id}`}
                  {...(p.status === 'published' ? { viewHref: `/blog/${p.slug}`, canUnpublish: true } : {})}
                  labels={{ edit: t('adminBlog.list.actions.edit'), view: t('adminBlog.list.actions.view'), duplicate: t('adminBlog.list.actions.duplicate'), unpublish: t('adminBlog.list.actions.unpublish') }}
                  onDuplicate={() => void duplicate(p)}
                  onUnpublish={() => { setReauth(false); setUnpublishing(p); }}
                  delay={Math.min(i, 8) * 40}
                />
              ))}
            </BlogPostList>
            {pages > 1 ? (
              <nav aria-label={t('adminBlog.list.pageSummary', { page, pages })} className="flex items-center justify-end gap-3 text-[13.5px] text-muted">
                <span>{t('adminBlog.list.pageSummary', { page, pages })}</span>
                <Button variant="secondary" disabled={page <= 1} onClick={() => url.push({ page: String(page - 1) })}>{t('adminBlog.list.prev')}</Button>
                <Button variant="secondary" disabled={page >= pages} onClick={() => url.push({ page: String(page + 1) })}>{t('adminBlog.list.next')}</Button>
              </nav>
            ) : null}
          </>
        )}
      </div>

      <NewPostDialog open={creating} onOpenChange={setCreating} />
      <ReasonDialog
        open={!!unpublishing}
        onOpenChange={(o) => !o && setUnpublishing(null)}
        danger
        title={t('adminBlog.unpublish.title')}
        summary={t('adminBlog.unpublish.confirmMessage', { title: unpublishing?.title ?? '' })}
        reasonLabel={t('adminBlog.unpublish.reasonLabel')}
        tooShortText={t('adminBlog.unpublish.tooShort')}
        errorText={reauth ? t('adminBlog.unpublish.reauth') : t('adminBlog.unpublish.error')}
        confirmLabel={t('adminBlog.unpublish.button')}
        cancelLabel={t('adminBlog.unpublish.cancel')}
        doneLabel={t('adminBlog.unpublish.done')}
        receiptText={(id) => t('adminBlog.unpublish.registered', { id })}
        onConfirm={unpublish}
        onConfirmed={() => { toast({ title: t('adminBlog.unpublish.success') }); router.refresh(); }}
      />
    </>
  );
}

