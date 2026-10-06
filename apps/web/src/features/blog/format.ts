import type { BlogListItem } from '@remoa/contracts';
import { t } from '@remoa/strings';

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' });
/** "2 out 2026" (the mock's format; Intl alone gives "2 de out. de 2026"). */
export const shortDate = (d: Date | string) => {
  const p = Object.fromEntries(dateFmt.formatToParts(new Date(d)).map((x) => [x.type, x.value]));
  return `${p.day} ${String(p.month).replace('.', '')} ${p.year}`;
};

export const readingTimeLabel = (n: number) => t('blog.components.postCard.readingTime', { n });

/** BlogListItem -> PostCard props; shared by the blog pages and the Landing section. ponytail: a post without cover gets the app icon; publishing probably requires a cover, so this is a safety net. */
export const cardProps = (p: BlogListItem, sizes = '(min-width: 768px) 380px, 100vw') => {
  const when = new Date(p.publishedAt ?? p.updatedAt);
  return {
    href: `/blog/${p.slug}`,
    cover: p.cover
      ? { src: p.cover.url, alt: p.cover.alt, width: p.cover.width, height: p.cover.height, srcSet: p.cover.srcset.webp, sizes }
      : { src: '/icon.svg', alt: '', width: 1200, height: 630 },
    category: p.category?.name ?? t('blog.navigation.blog'),
    title: p.title,
    description: p.excerpt ?? p.description,
    date: shortDate(when),
    dateTime: when.toISOString(),
    readingTime: readingTimeLabel(p.readingMinutes),
  };
};
