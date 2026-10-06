/** Imagem de capa. `width`/`height` são obrigatórios (CLS) e `alt` também (SEO). `srcSet`/`sizes` vêm das variantes WebP do R2. */
export type BlogCover = { src: string; alt: string; width: number; height: number; srcSet?: string; sizes?: string };
export type BlogTemplate = 'leitura' | 'guia' | 'destaque';
export type BlogHeadingLevel = 2 | 3;
