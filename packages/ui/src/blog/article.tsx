import type { ReactNode } from 'react';
import { Icon } from '../icons';
import { focusRing } from '../button-styles';
import { PostCard, type PostCardProps } from './post-card';
import type { BlogTemplate } from './types';

/**
 * ArticleBody (F27): wrapper tipográfico do texto do post. Recebe em `html` o HTML JÁ SANITIZADO pelo renderizador (`packages/blog`, lista de permissão):
 * este componente NÃO sanitiza nada. Coluna de leitura: o pai define a largura (680 a 700 px). Corpo 18/1.75 (17 no celular), links na cor da marca sublinhados.
 * `template` muda só o que o mock muda: `leitura` H2 simples; `guia` H2 com barra lateral na cor da marca; `destaque` H2 numerado em círculo (01, 02…, contador CSS
 * `::before`, não vai no HTML) e citação grande.
 *
 * CONTRATO DE CLASSES (o renderizador de HTML emite exatamente isto; o CSS está em `motion.css`, seção F27, escopado em `.rb-article`):
 * - `h2[id]` e `h3[id]` (o único H1 é o do PostHero; `scroll-margin-top: 96px`), `p`, `ul`, `ol`, `li`, `strong`, `em`, `blockquote`, `a[href]`
 * - `figure > img + figcaption`: imagem com `width`/`height`/`alt`, cantos de 22 px; legenda de 14 px
 * - `div.rb-callout[role="note"][data-variant="dica|atencao|nota"] > div`: caixa de destaque (NÃO `aside`: vários landmarks `complementary` iguais reprovam no axe) (ícone por CSS; o rótulo vem em `<strong>Dica.</strong>` no começo do `div`)
 * - `div.rb-faq > details.rb-faq-item > summary + p`: perguntas e respostas (nativo, sem JS; o `FAQPage` JSON-LD é do app)
 * - `a.rb-button[href]`: botão de chamada dentro do texto
 * - `mark.rb-pending` (só fora de produção): variável não preenchida, destacada em amarelo
 */
export function ArticleBody({ html, template }: { html: string; template: BlogTemplate }) {
  return <div className="rb-article" data-template={template} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** QuickSummary (F27): caixa "Resumo rápido" do Guia, antes do texto. `items` são os pontos do resumo. */
export function QuickSummary({ title, items }: { title: string; items: ReadonlyArray<string> }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title} className="mb-8 rounded-[22px] border border-border-strong bg-surface px-6 py-[22px]">
      <h2 className="m-0 text-xs font-bold tracking-[0.12em] text-muted uppercase">{title}</h2>
      <ul className="mt-2.5 mb-0 list-disc pl-[22px] text-[17px] leading-[1.7] text-ink-2">
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </section>
  );
}

/** AuthorBox (F27): caixa do autor no fim do texto. `avatarSrc` opcional (sem ele, a inicial do nome numa bolinha da marca). `bio` inclui o aviso de conteúdo educacional se o app quiser. */
export function AuthorBox({ name, bio, avatarSrc }: { name: string; bio: string; avatarSrc?: string }) {
  return (
    <div className="mt-12 flex items-center gap-4 rounded-3xl border border-border bg-surface p-[22px]">
      {avatarSrc ? (
        <img src={avatarSrc} alt="" width={56} height={56} loading="lazy" className="size-14 shrink-0 rounded-full object-cover" />
      ) : (
        <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary font-display text-[22px] font-extrabold text-on-primary">{name.trim().charAt(0).toUpperCase()}</span>
      )}
      <span className="flex flex-col gap-0.5 leading-[1.4]">
        <span className="font-extrabold">{name}</span>
        <span className="text-[14.5px] text-muted">{bio}</span>
      </span>
    </div>
  );
}

/**
 * PostCta (F27): chamada para criar o primeiro mapa (`label` = "Criar meu primeiro mapa", sempre um link para a Landing/cadastro).
 * `variant`: `light` (caixa lilás, Leitura e índice), `dark` (caixa `--panel-dark` com botão branco, Destaque) e `band` (a mesma lilás, mas dentro do contêiner de 1200 px, faixa final do Guia).
 * O `h2` da chamada leva `id` próprio (`titleId`) para o `aria-labelledby`.
 */
export type PostCtaProps = { variant?: 'light' | 'dark' | 'band'; title: string; text: string; label: string; href: string; titleId?: string };

export function PostCta({ variant = 'light', title, text, label, href, titleId = 'post-cta-title' }: PostCtaProps) {
  const dark = variant === 'dark';
  const box = (
    <section aria-labelledby={titleId} className={`mt-14 flex flex-wrap items-center justify-between gap-6 rounded-hero px-6 py-[34px] md:px-9 ${dark ? 'bg-panel-dark text-on-dark' : 'bg-primary-tint text-ink'}`}>
      <div className="flex max-w-[520px] flex-col gap-2">
        <h2 id={titleId} className="m-0 font-display text-[26px] leading-[1.15] font-extrabold tracking-[-0.03em] md:text-[28px]">{title}</h2>
        <p className={`m-0 text-base leading-[1.55] ${dark ? 'text-on-dark-muted-2' : 'text-ink-2'}`}>{text}</p>
      </div>
      <a
        href={href}
        className={`lift flex h-14 items-center gap-2.5 rounded-field px-7 text-[17px] font-extrabold no-underline ${focusRing} ${dark ? 'bg-on-dark text-panel-dark' : 'bg-primary text-on-primary'}`}
      >
        {label}
        <Icon name="right" size={20} aria-hidden="true" />
      </a>
    </section>
  );
  return variant === 'band' ? <div className="mx-auto w-full max-w-[1200px] px-5 md:px-10">{box}</div> : box;
}

/** RelatedPosts (F27): "Continue lendo", no máximo 3 cartões `related` (mesma categoria primeiro: ordem do app). Empilha no celular. `title` é um `h2`. */
export function RelatedPosts({ title, posts }: { title: string; posts: ReadonlyArray<Omit<PostCardProps, 'variant'>> }) {
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby="related-title" className="mx-auto mt-[72px] w-full max-w-[1100px]">
      <h2 id="related-title" className="m-0 mb-[22px] font-display text-[28px] font-extrabold tracking-[-0.03em]">{title}</h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
        {posts.slice(0, 3).map((p) => <PostCard key={p.href} {...p} variant="related" headingLevel={3} />)}
      </div>
    </section>
  );
}

/** EducationalNotice (F27): aviso "Conteúdo educacional. Não substitui diretriz clínica nem supervisão" (texto por prop; entra em todo post de saúde). Nota discreta com ícone, `role="note"`. */
export function EducationalNotice({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <p role="note" className="mt-6 mb-0 flex items-start gap-2.5 rounded-2xl bg-chip px-4 py-3 text-[13.5px] leading-normal text-muted">
      <span className="mt-px shrink-0 text-primary-deep"><Icon name="shield" size={18} aria-hidden="true" /></span>
      <span>{text}{children}</span>
    </p>
  );
}

/** PostLayout (F27): colunas de leitura. `single` = coluna de 700 px centrada (Leitura), `narrow` = 680 px (Destaque), `guide` = índice lateral de 280 px + texto de 700 px (Guia; no celular empilha, índice em cima). */
export function PostLayout({ layout, aside, children }: { layout: 'single' | 'narrow' | 'guide'; aside?: ReactNode; children: ReactNode }) {
  if (layout === 'guide') {
    return (
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-start gap-x-14 gap-y-8 px-5 pt-7 md:px-10 md:pt-12">
        <aside className="min-w-0 flex-[1_1_100%] self-stretch lg:flex-[0_0_280px]">{aside}</aside>
        <article className="min-w-0 max-w-[700px] flex-[1_1_300px] lg:flex-[1_1_480px]">{children}</article>
      </div>
    );
  }
  return (
    <article className={`mx-auto w-full px-5 md:px-10 ${layout === 'narrow' ? 'max-w-[680px] pt-10 md:pt-14 md:max-w-[760px]' : 'mt-10 max-w-[700px] md:max-w-[780px]'}`}>
      {aside ? <div className="mb-9">{aside}</div> : null}
      {children}
    </article>
  );
}
