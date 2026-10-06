import { t } from '@remoa/strings';
import { LandingBlogSection } from '@remoa/ui';
import { getLatestPosts, toLandingPost } from './latest-posts';
import { LandingBlogTrack } from './track';

/** F27 FR-39/40: async server section; renders nothing when the API has no posts (or is down). */
export async function LandingBlog() {
  const posts = await getLatestPosts(5);
  if (!posts.length) return null;
  const items = posts.map(toLandingPost);
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
