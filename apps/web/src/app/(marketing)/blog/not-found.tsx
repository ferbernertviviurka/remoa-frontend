import type { Metadata } from 'next';
import { t } from '@remoa/strings';
import { Empty, PostCard, buttonVariants } from '@remoa/ui';
import { getLatestPosts } from '@/features/blog/api';
import { cardProps } from '@/features/blog/format';

export const metadata: Metadata = { title: { absolute: t('blog.pages.post.notFound.title') }, robots: { index: false, follow: true } };

/** FR-20: a 404 that keeps the reader (latest posts, link back). */
export default async function NotFound() {
  const posts = (await getLatestPosts(3)).slice(0, 3);
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-16 md:px-10">
      <Empty
        heading
        title={t('blog.pages.post.notFound.title')}
        description={t('blog.pages.post.notFound.body')}
        action={<a href="/blog" className={`inline-flex min-h-11 items-center rounded-btn px-4 font-display text-sm font-bold no-underline ${buttonVariants.primary}`}>{t('blog.pages.post.notFound.suggestion')}</a>}
      />
      {posts.length ? (
        <section aria-labelledby="suggest" className="mt-14">
          <h2 id="suggest" className="m-0 mb-5 font-display text-[26px] font-extrabold tracking-[-0.03em]">{t('blog.pages.post.suggestionsTitle')}</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {posts.map((p) => <PostCard key={p.id} {...cardProps(p)} variant="related" headingLevel={3} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
