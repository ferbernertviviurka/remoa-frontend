import type { ReactNode } from 'react';
import { Icon } from '../icons';
import { focusRing } from '../button-styles';

/**
 * BlogCategoryChips (F27): chips de categoria do índice, cada um um link (`href`) com contagem. O ativo leva `aria-current="page"`.
 * (O nome tem prefixo porque `CategoryChips` já existe nas preferências de notificação.) Alvo de 44 px, filtro por URL (indexável).
 */
export type BlogCategoryChipsProps = { label: string; items: ReadonlyArray<{ label: string; count: number; href: string; active?: boolean }> };

export function BlogCategoryChips({ label, items }: BlogCategoryChipsProps) {
  return (
    <nav aria-label={label}>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {items.map((c) => (
          <li key={c.href}>
            <a
              href={c.href}
              aria-current={c.active ? 'page' : undefined}
              className={`flex h-11 items-center gap-2 rounded-pill border-[1.5px] px-[18px] text-[14.5px] font-bold no-underline transition-[background-color,border-color] duration-200 ${focusRing} ${c.active ? 'border-primary bg-primary-tint text-primary-deep' : 'border-border-strong bg-surface text-ink hover:border-primary'}`}
            >
              {c.label}
              <span className="text-[12.5px] opacity-70">{c.count}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Pagination (F27): links de página (`/blog/pagina/N`), nunca botões, para o Google seguir. `pages` já vem recortada pelo app;
 * a atual leva `aria-current="page"`. `prev`/`next` sem `href` ficam desabilitados (`aria-disabled`, sem foco). Quadrados de 48 px. Não renderiza com ≤ 1 página.
 */
export type PaginationProps = {
  label: string;
  prevLabel: string;
  nextLabel: string;
  pages: ReadonlyArray<{ number: number; href: string; label: string; current?: boolean }>;
  prevHref?: string | null;
  nextHref?: string | null;
};

const box = 'flex size-12 items-center justify-center rounded-[14px] border-[1.5px] font-extrabold no-underline';

export function Pagination({ label, prevLabel, nextLabel, pages, prevHref, nextHref }: PaginationProps) {
  if (pages.length <= 1) return null;
  const arrow = (href: string | null | undefined, name: 'left' | 'right', text: string) =>
    href ? (
      <a href={href} rel={name === 'left' ? 'prev' : 'next'} aria-label={text} className={`${box} border-border-strong bg-surface text-ink hover:border-primary ${focusRing}`}>
        <Icon name={name} size={20} aria-hidden="true" />
      </a>
    ) : (
      <span aria-label={text} aria-disabled="true" role="link" className={`${box} border-border-strong bg-surface text-ink opacity-40`}>
        <Icon name={name} size={20} aria-hidden="true" />
      </span>
    );
  return (
    <nav aria-label={label} className="flex items-center justify-center gap-2 pt-2">
      {arrow(prevHref, 'left', prevLabel)}
      {pages.map((p) => (
        <a
          key={p.number}
          href={p.href}
          aria-label={p.label}
          aria-current={p.current ? 'page' : undefined}
          className={`${box} ${focusRing} ${p.current ? 'border-primary bg-primary-tint text-primary-deep' : 'border-border-strong bg-surface text-ink hover:border-primary'}`}
        >
          {p.number}
        </a>
      ))}
      {arrow(nextHref, 'right', nextLabel)}
    </nav>
  );
}

/**
 * BlogSearch (F27): `<form method="get" role="search">`, funciona sem JS; Enter envia (há um botão de envio só para leitor de tela).
 * `hidden` repete parâmetros (ex.: `{ categoria: 'enamed' }`). Campo 320 × 46 px (largura total no celular), lupa decorativa.
 */
export type BlogSearchProps = { action: string; label: string; placeholder: string; submitLabel: string; name?: string; defaultValue?: string; hidden?: Record<string, string> };

export function BlogSearch({ action, label, placeholder, submitLabel, name = 'q', defaultValue, hidden }: BlogSearchProps) {
  return (
    <form action={action} method="get" role="search" className="relative block w-full md:w-80">
      <label htmlFor="blog-search-q" className="sr-only">{label}</label>
      <span className="pointer-events-none absolute top-3.5 left-3.5 text-muted"><Icon name="search" size={20} aria-hidden="true" /></span>
      {Object.entries(hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input
        id="blog-search-q"
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`box-border h-[46px] w-full rounded-[14px] border-[1.5px] border-border-strong bg-surface pr-3.5 pl-11 text-base text-ink placeholder:text-muted ${focusRing}`}
      />
      <button type="submit" className="sr-only">{submitLabel}</button>
    </form>
  );
}

/**
 * Breadcrumbs (F27): migalhas com `›`; o último item (sem `href`) é a página atual (`aria-current="page"`).
 * `tone="dark"` para o topo escuro do Destaque. Mesmo conteúdo do JSON-LD `BreadcrumbList` que o app monta.
 */
export type BreadcrumbsProps = { label: string; items: ReadonlyArray<{ label: string; href?: string }>; tone?: 'light' | 'dark' };

export function Breadcrumbs({ label, items, tone = 'light' }: BreadcrumbsProps) {
  return (
    <nav aria-label={label} className={`text-sm ${tone === 'dark' ? 'text-on-dark-muted' : 'text-muted'}`}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
        {items.map((it, i) => (
          <li key={`${i}-${it.label}`} className="flex items-center gap-2">
            {i > 0 ? <span aria-hidden="true">›</span> : null}
            {it.href ? <a href={it.href} className={`font-semibold text-inherit underline-offset-2 hover:underline ${focusRing}`}>{it.label}</a> : <span aria-current="page" className="font-semibold">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * BlogIndexHeader (F27): faixa lilás do topo de `/blog` e das categorias: eyebrow, `h1` de 58 px que sobe (`rb-rise`, 800 ms), apoio e, em `children`,
 * a busca e os chips. O H1 é único da página.
 */
export function BlogIndexHeader({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead?: string; children?: ReactNode }) {
  return (
    <div className="border-b border-border bg-primary-tint">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 pt-10 pb-9 md:px-10 md:pt-16 md:pb-[52px]">
        <span className="text-xs font-bold tracking-[0.12em] text-muted uppercase">{eyebrow}</span>
        <h1 className="rb-rise m-0 font-display text-[36px] leading-[1.04] font-extrabold tracking-[-0.045em] md:text-[58px]">{title}</h1>
        {lead ? <p className="m-0 max-w-[640px] text-[17px] leading-[1.55] text-ink-2 md:text-xl">{lead}</p> : null}
        {children ? <div className="mt-2.5 flex flex-wrap items-center gap-3.5">{children}</div> : null}
      </div>
    </div>
  );
}
