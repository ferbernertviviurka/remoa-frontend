import type { ReactNode } from 'react';
import { Icon } from '../icons';
import { focusRing } from '../button-styles';
import type { BlogCover, BlogHeadingLevel } from './types';

/**
 * PostCard (F27). Cartão de post inteiro clicável (um `<a>` com o título como cabeçalho dentro).
 * `variant`: `default` (grade do índice: capa 190 px, raio 28), `related` (Continue lendo: capa 150 px, raio 26),
 * `feature` (destaque grande da Landing: capa 300 px, raio 32) e `compact` (linha com miniatura 132 × 96, usada à direita na Landing).
 * `date` e `readingTime` já vêm formatados (o app usa `t()`), ex.: "2 out 2026" e "9 min de leitura"; `dateTime` (ISO) vira o atributo do `<time>`.
 * `headingLevel` (padrão 3) é o nível do título dentro do cartão: use 2 quando não há H2 acima. `priority` marca a capa como `fetchpriority="high"` (LCP);
 * as demais são `loading="lazy"`. `delay` (ms) escalona a entrada (`slide` de 500 ms; 70 ms entre cartões, é o `BlogGrid` que calcula). Elevação de 200 ms no hover (`.lift`).
 */
export type PostCardProps = {
  href: string;
  cover: BlogCover;
  category: string;
  title: string;
  description?: string;
  date: string;
  dateTime?: string;
  readingTime: string;
  variant?: 'default' | 'related' | 'feature' | 'compact';
  headingLevel?: BlogHeadingLevel;
  priority?: boolean;
  delay?: number;
};

const V = {
  default: { box: 'rounded-[28px]', img: 'h-[190px]', body: 'gap-2.5 px-6 pt-[22px] pb-6', title: 'text-[22px] tracking-[-0.025em]', desc: 'text-[15.5px]' },
  related: { box: 'rounded-[26px]', img: 'h-[150px]', body: 'gap-2.5 px-[22px] pt-5 pb-[22px]', title: 'text-xl tracking-[-0.025em]', desc: 'text-[15px]' },
  feature: { box: 'rounded-[32px]', img: 'h-[220px] md:h-[300px]', body: 'gap-3 px-7 pt-[26px] pb-[30px]', title: 'text-[26px] tracking-[-0.03em] md:text-[30px]', desc: 'text-base' },
} as const;

export function CoverImage({ cover, priority, fill }: { cover: BlogCover; priority?: boolean; fill?: string }) {
  return (
    <img
      src={cover.src}
      srcSet={cover.srcSet}
      sizes={cover.sizes}
      alt={cover.alt}
      width={cover.width}
      height={cover.height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      {...(priority ? { fetchPriority: 'high' as const } : {})}
      className={`block w-full object-cover ${fill ?? ''}`}
    />
  );
}

function Title({ level, className, children }: { level: BlogHeadingLevel; className: string; children: string }) {
  const H = level === 2 ? 'h2' : 'h3';
  return <H className={`m-0 font-display font-extrabold leading-[1.2] ${className}`}>{children}</H>;
}

export function PostCard({ href, cover, category, title, description, date, dateTime, readingTime, variant = 'default', headingLevel = 3, priority, delay }: PostCardProps) {
  const style = delay ? { animationDelay: `${delay}ms` } : undefined;
  const meta = (cls: string) => (
    <span className={cls}>
      <time dateTime={dateTime}>{date}</time> · {readingTime}
    </span>
  );
  if (variant === 'compact') {
    return (
      <a href={href} className={`lift flex items-center gap-4 rounded-3xl border border-border bg-surface p-3 text-ink no-underline ${focusRing}`} style={style}>
        <span className="block h-24 w-[132px] shrink-0 overflow-hidden rounded-2xl">
          <CoverImage cover={cover} priority={priority} fill="h-24" />
        </span>
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-bold text-primary-deep">{category}</span>
          <Title level={headingLevel} className="text-lg tracking-[-0.02em]">{title}</Title>
          {meta('text-[12.5px] text-muted')}
        </span>
      </a>
    );
  }
  const v = V[variant];
  return (
    <a href={href} className={`lift ${delay !== undefined ? 'rb-card' : ''} flex flex-col overflow-hidden border border-border bg-surface text-ink no-underline ${v.box} ${focusRing}`} style={style}>
      <span className={`block overflow-hidden ${v.img}`}>
        <CoverImage cover={cover} priority={priority} fill={v.img} />
      </span>
      <span className={`flex flex-col ${v.body}`}>
        <span className="self-start rounded-pill bg-primary-tint px-3 py-[3px] text-[12.5px] font-bold text-primary-deep">{category}</span>
        <Title level={headingLevel} className={v.title}>{title}</Title>
        {description ? <span className={`leading-[1.55] text-ink-2 ${v.desc}`}>{description}</span> : null}
        {meta('text-[13px] text-muted')}
      </span>
    </a>
  );
}

/**
 * FeaturedPost (F27): destaque do índice, post mais recente na página 1. Cartão largo (raio 34) com capa à esquerda (mín. 340 px) e texto à direita;
 * `ctaLabel` ("Ler o artigo") é decorativo (o cartão inteiro é o link). A capa é a imagem do LCP (`fetchpriority="high"`). Título em `h2`.
 */
export type FeaturedPostProps = Omit<PostCardProps, 'variant' | 'delay' | 'priority' | 'headingLevel'> & { ctaLabel: string };

export function FeaturedPost({ href, cover, category, title, description, date, dateTime, readingTime, ctaLabel }: FeaturedPostProps) {
  return (
    <a href={href} className={`lift flex flex-wrap overflow-hidden rounded-[34px] border border-border bg-surface text-ink no-underline ${focusRing}`}>
      <span className="block min-h-[220px] flex-[1_1_520px] overflow-hidden md:min-h-[340px]">
        <CoverImage cover={cover} priority fill="h-full min-h-[220px] md:min-h-[340px]" />
      </span>
      <span className="flex flex-[1_1_440px] flex-col justify-center gap-3.5 px-6 py-8 md:px-10 md:py-9">
        <span className="self-start rounded-pill bg-primary-tint px-3.5 py-1 text-[13px] font-bold text-primary-deep">{category}</span>
        <h2 className="m-0 font-display text-[28px] leading-[1.12] font-extrabold tracking-[-0.035em] md:text-[38px]">{title}</h2>
        {description ? <span className="text-[17px] leading-[1.6] text-ink-2">{description}</span> : null}
        <span className="text-sm text-muted"><time dateTime={dateTime}>{date}</time> · {readingTime}</span>
        <span className="flex items-center gap-2 font-extrabold text-primary-deep">{ctaLabel}<Icon name="right" size={18} aria-hidden="true" /></span>
      </span>
    </a>
  );
}

/** BlogGrid (F27): grade do índice (colunas de mín. 340 px, vão 24). Escalona a entrada dos filhos (use `PostCard delay`; `blogStagger(i)` = `i × 70`). */
export const blogStagger = (index: number) => index * 70;
export function BlogGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-6 md:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">{children}</div>;
}
