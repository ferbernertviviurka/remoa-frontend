import { t } from '@remoa/strings/full';
import { LandingBlogSection } from '@remoa/ui';
import { cardProps } from '@/features/blog/format';
import { getLatestPosts } from './latest-posts';
import { LandingBlogTrack } from './track';

/** F27 FR-39/40: async server section; renders nothing when the API has no posts (or is down). */
export async function LandingBlog() {
  const posts = await getLatestPosts(5);
  if (!posts.length) return null;
  const items = posts.map((p) => cardProps(p, '(min-width: 1024px) 560px, 100vw'));
  return (
    <LandingBlogTrack hrefs={items.map((p) => p.href)}>
    <LandingBlogSection
      eyebrow={t('blog.navigation.blog')}
      title={t('blog.landing.sectionTitle')}
      lead={t('blog.landing.sectionDescription')}
      moreLabel={t('blog.landing.viewMore')}
      moreHref="/blog"
      posts={items}
    />
    </LandingBlogTrack>
  );
}
