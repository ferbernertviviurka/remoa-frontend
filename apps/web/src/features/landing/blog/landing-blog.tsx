import { t } from '@remoa/strings';
import { LandingBlogSection } from '@remoa/ui';
import { getLatestPosts, toLandingPost } from './latest-posts';

/** F27 FR-39/40: async server section; renders nothing when the API has no posts (or is down). */
export async function LandingBlog() {
  const posts = await getLatestPosts(5);
  return (
    <LandingBlogSection
      eyebrow={t('blog.navigation.blog')}
      title={t('blog.landing.sectionTitle')}
      lead={t('blog.landing.sectionDescription')}
      moreLabel={t('blog.landing.viewMore')}
      moreHref="/blog"
      posts={posts.map(toLandingPost)}
    />
  );
}
