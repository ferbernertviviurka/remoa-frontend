import SearchPage, { generateMetadata as searchMetadata } from '../blog-busca/page';

export const revalidate = 86400; // literal: Next lê o segmento config estaticamente; = BLOG_REVALIDATE

/** P-410: /blog without `?q=` is static (ISR by the `blog` tags); the search is `/blog-busca` (rewrite in next.config). */
const none = { searchParams: Promise.resolve({}) };
export const generateMetadata = () => searchMetadata(none);
export default function Page() {
  return SearchPage(none);
}
