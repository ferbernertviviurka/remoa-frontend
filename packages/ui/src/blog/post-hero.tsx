import { Breadcrumbs, type BreadcrumbsProps } from './blog-nav';
import { CoverImage } from './post-card';
import type { BlogCover, BlogTemplate } from './types';

/**
 * PostHero (F27): topo do post, 3 variações pelo `template`. É o ÚNICO `h1` da página.
 * - `leitura`: migalhas, etiqueta, título 46 px (32 no celular), resumo, autor e meta; capa 16:9 de até 960 px abaixo (raio 30; 200 px de altura no celular).
 * - `guia`: faixa lilás com texto e capa lado a lado (capa 320 px de altura, sombra); etiqueta branca.
 * - `destaque`: capa escura de largura total (a imagem fica ao fundo a 45% sob um degradê roxo), título de 62 px (36 no celular) e etiqueta laranja `badge`
 *   ("Lista · 7 min de leitura"); no Destaque o `badge` é obrigatório e a `category` não aparece como etiqueta (já está nas migalhas).
 * `meta` já vem formatado ("2 de outubro de 2026 · 9 min de leitura"); `dateTime` (ISO) vai no `<time>`. A capa é a imagem do LCP (`fetchpriority="high"`).
 */
export type PostHeroProps = {
  template: BlogTemplate;
  breadcrumbs: BreadcrumbsProps;
  category: string;
  badge?: string;
  title: string;
  description: string;
  author: string;
  dateTime?: string;
  meta: string;
  cover: BlogCover;
};

function Byline({ author, dateTime, meta, dark }: Pick<PostHeroProps, 'author' | 'dateTime' | 'meta'> & { dark?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-primary font-extrabold text-on-primary">{author.trim().charAt(0).toUpperCase()}</span>
      <span className="flex flex-col leading-[1.3]">
        <span className={`text-[15px] font-bold ${dark ? 'text-on-dark' : 'text-ink'}`}>{author}</span>
        <time dateTime={dateTime} className={`text-[13.5px] ${dark ? 'text-on-dark-muted-2' : 'text-muted'}`}>{meta}</time>
      </span>
    </div>
  );
}

const h1 = 'm-0 font-display font-extrabold';

export function PostHero(p: PostHeroProps) {
  const by = <Byline author={p.author} dateTime={p.dateTime} meta={p.meta} dark={p.template === 'destaque'} />;
  if (p.template === 'destaque') {
    return (
      <header className="relative overflow-hidden bg-panel-dark text-on-dark">
        <CoverImage cover={p.cover} priority fill="absolute inset-0 h-full opacity-45" />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(36,26,92,0.2),var(--panel-dark)_96%)]" />
        <div className="relative mx-auto flex w-full max-w-[860px] flex-col gap-5 px-5 pt-10 pb-11 md:px-10 md:pt-[72px] md:pb-20">
          <Breadcrumbs {...p.breadcrumbs} tone="dark" />
          {p.badge ? <span className="self-start rounded-pill bg-review-on-dark px-3.5 py-1 text-[13px] font-extrabold text-panel-dark">{p.badge}</span> : null}
          <h1 className={`${h1} text-4xl leading-[1.04] tracking-[-0.045em] md:text-[62px]`}>{p.title}</h1>
          <p className="m-0 text-[17px] leading-[1.55] text-on-dark-muted-2 md:text-[21px]">{p.description}</p>
          {by}
        </div>
      </header>
    );
  }
  if (p.template === 'guia') {
    return (
      <header className="border-b border-border bg-primary-tint">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-x-14 gap-y-9 px-5 py-9 md:px-10 md:pt-14 md:pb-16">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-[18px]">
            <Breadcrumbs {...p.breadcrumbs} />
            <span className="self-start rounded-pill bg-surface px-3.5 py-1 text-[13px] font-bold text-primary-deep">{p.category}</span>
            <h1 className={`${h1} text-[32px] leading-[1.08] tracking-[-0.04em] md:text-[46px]`}>{p.title}</h1>
            <p className="m-0 text-[17px] leading-[1.55] text-ink-2 md:text-xl">{p.description}</p>
            {by}
          </div>
          <div className="flex-[1_1_360px] overflow-hidden rounded-hero shadow-[0_30px_60px_rgba(36,26,92,0.2)]">
            <CoverImage cover={p.cover} priority fill="h-[200px] md:h-80" />
          </div>
        </div>
      </header>
    );
  }
  return (
    <>
      <header className="mx-auto w-full max-w-[1200px] px-5 md:px-10">
        <div className="mx-auto flex max-w-[860px] flex-col gap-[18px] pt-7 md:pt-12">
          <Breadcrumbs {...p.breadcrumbs} />
          <span className="self-start rounded-pill bg-primary-tint px-3.5 py-1 text-[13px] font-bold text-primary-deep">{p.category}</span>
          <h1 className={`${h1} text-[32px] leading-[1.08] tracking-[-0.04em] md:text-[46px]`}>{p.title}</h1>
          <p className="m-0 text-[17px] leading-[1.55] text-ink-2 md:text-xl">{p.description}</p>
          {by}
        </div>
        <div className="mx-auto mt-7 max-w-[960px] overflow-hidden rounded-[20px] md:rounded-hero">
          <CoverImage cover={p.cover} priority fill="h-[200px] md:h-[440px]" />
        </div>
      </header>
    </>
  );
}
