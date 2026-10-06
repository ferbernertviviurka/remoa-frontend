import { Icon } from '../icons';
import { focusRing } from '../button-styles';
import { Reveal } from '../marketing/reveal';
import { PostCard, type PostCardProps } from './post-card';

/**
 * LandingBlogSection (F27 FR-39/40): seção "Aprenda a estudar melhor" da Landing, antes da chamada final.
 * `posts` = os últimos publicados (o app passa `getLatestPosts(5)`): o 1º é o destaque grande à esquerda (`feature`), os próximos até 4 são cartões
 * compactos à direita; com 1 a 4 posts mostra os que houver. **Com lista vazia não renderiza nada** (a seção some). Botão "Ver mais artigos" (`moreLabel`)
 * no topo (contorno) e no fim (primário), ambos para `moreHref`. Cada bloco entra com 600 ms ao aparecer na tela (`Reveal`, CSS `view()`; visível sem suporte e
 * com movimento reduzido). Títulos dos cartões em `h3` (o `h2` é o da seção). Âncora `#blog`, `scroll-margin-top: 92px`.
 */
export type LandingBlogSectionProps = {
  id?: string;
  eyebrow: string;
  title: string;
  lead: string;
  moreLabel: string;
  moreHref: string;
  posts: ReadonlyArray<Omit<PostCardProps, 'variant' | 'headingLevel' | 'delay' | 'priority'>>;
};

export function LandingBlogSection({ id = 'blog', eyebrow, title, lead, moreLabel, moreHref, posts }: LandingBlogSectionProps) {
  if (posts.length === 0) return null;
  const [first, ...rest] = posts;
  const side = rest.slice(0, 4);
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-[92px] pt-16 pb-10 md:pt-24">
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-10">
        <Reveal>
          <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold tracking-[0.12em] text-muted uppercase">{eyebrow}</span>
              <h2 id={`${id}-title`} className="m-0 font-display text-[34px] leading-[1.05] font-extrabold tracking-[-0.04em] md:text-[46px]">{title}</h2>
              <p className="m-0 max-w-[560px] text-[17px] leading-[1.55] text-ink-2 md:text-lg">{lead}</p>
            </div>
            <a href={moreHref} className={`lift flex h-[52px] shrink-0 items-center gap-2 rounded-btn border-[1.5px] border-border-strong bg-surface px-6 text-base font-bold text-ink no-underline ${focusRing}`}>
              {moreLabel}
              <Icon name="right" size={18} aria-hidden="true" />
            </a>
          </div>
        </Reveal>
        <div className={`grid gap-6 ${side.length > 0 ? 'lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]' : ''}`}>
          <Reveal><PostCard {...first!} variant="feature" headingLevel={3} /></Reveal>
          {side.length > 0 ? (
            <div className="flex flex-col justify-between gap-3.5">
              {side.map((p) => <Reveal key={p.href}><PostCard {...p} variant="compact" headingLevel={3} /></Reveal>)}
            </div>
          ) : null}
        </div>
        <Reveal>
          <div className="mt-9 flex justify-center">
            <a href={moreHref} className={`lift flex h-14 items-center gap-2.5 rounded-field bg-primary px-[30px] text-[17px] font-extrabold text-on-primary no-underline ${focusRing}`}>
              {moreLabel}
              <Icon name="right" size={20} aria-hidden="true" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
