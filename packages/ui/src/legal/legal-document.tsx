'use client';

import type { ReactNode } from 'react';
import { Icon } from '../icons';
import { focusRing } from '../button-styles';

/**
 * LegalDocument (F27 FR-42/43): Termos de Uso e Política de Privacidade. Faixa lilás com `eyebrow`, `h1` (único), `lead`, chip de versão (`meta`: ReactNode, pode ter `mark.rb-pending`),
 * botão Imprimir (`window.print()`) e, em `notice`, o aviso amarelo "Rascunho para revisão jurídica" (só fora de produção; o app decide). Abaixo, índice lateral numerado
 * (sticky no desktop, em cima no celular) e o corpo: cada seção vira `section#id > h2` ("1. Quem somos"; a numeração é do componente) e o `html` (JÁ sanitizado/renderizado
 * do `content/legal/*.md`) usa `p`, `ul`, `ol`, `li`, `strong`, `a`, `h3`. Variável sem valor ou `[CONFIRMAR]`: `<mark class="rb-pending">` (amarelo, só fora de produção).
 * Impressão: some o índice, o botão e o aviso; corpo em preto sobre branco, seções sem quebra no meio (CSS em `motion.css`, `.rb-noprint`). Sem JS o corpo e o índice funcionam; só Imprimir precisa de JS.
 */
export type LegalSection = { id: string; title: string; html: string };
export type LegalDocumentProps = {
  eyebrow: string;
  title: string;
  lead: string;
  meta: ReactNode;
  printLabel: string;
  tocLabel: string;
  tocTitle: string;
  notice?: ReactNode;
  sections: ReadonlyArray<LegalSection>;
};

export function LegalDocument({ eyebrow, title, lead, meta, printLabel, tocLabel, tocTitle, notice, sections }: LegalDocumentProps) {
  return (
    <div className="rb-legal">
      <div className="border-b border-border bg-primary-tint">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-5 py-8 md:px-10 md:pt-14 md:pb-12">
          <span className="rb-noprint text-xs font-bold tracking-[0.12em] text-muted uppercase">{eyebrow}</span>
          <h1 className="m-0 font-display text-[34px] leading-[1.08] font-extrabold tracking-[-0.04em] md:text-[52px]">{title}</h1>
          <p className="m-0 max-w-[720px] text-lg leading-[1.6] text-ink-2">{lead}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3.5">
            <span className="rounded-pill border border-border-strong bg-surface px-3.5 py-1 text-[13px] font-bold text-primary-deep">{meta}</span>
            <button
              type="button"
              onClick={() => window.print()}
              className={`rb-noprint flex h-11 items-center gap-2 rounded-[13px] border-[1.5px] border-border-strong bg-surface px-4 text-sm font-bold text-ink hover:border-primary ${focusRing}`}
            >
              <Icon name="file" size={18} aria-hidden="true" />
              {printLabel}
            </button>
          </div>
          {notice ? <div role="note" className="rb-noprint mt-2.5 max-w-[760px] rounded-[14px] border border-watch bg-watch-bg px-4 py-3 text-[13.5px] leading-normal text-watch-text">{notice}</div> : null}
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-start gap-x-14 gap-y-8 px-5 pt-7 pb-20 md:px-10 md:pt-12">
        <aside className="rb-noprint min-w-0 flex-[1_1_100%] lg:flex-[0_0_300px]">
          <nav aria-label={tocLabel} className="flex flex-col gap-0.5 rounded-[22px] border border-border bg-surface px-2 py-3.5 lg:sticky lg:top-[100px]">
            <span className="px-3 pt-1 pb-2 text-xs font-bold tracking-[0.12em] text-muted uppercase">{tocTitle}</span>
            <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className={`flex min-h-11 items-center gap-2.5 rounded-[10px] px-3 text-[14.5px] font-semibold text-ink-2 no-underline hover:bg-primary-tint hover:text-primary-deep lg:min-h-[38px] ${focusRing}`}>
                    <span aria-hidden="true" className="w-[22px] shrink-0 text-muted">{i + 1}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
        <article className="min-w-0 max-w-[760px] flex-[1_1_480px]">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-t`} className="rb-legal-section mb-[34px] scroll-mt-[100px]">
              <h2 id={`${s.id}-t`} className="m-0 mb-3 font-display text-[26px] leading-[1.25] font-extrabold tracking-[-0.025em]">{i + 1}. {s.title}</h2>
              <div className="rb-legal-body" dangerouslySetInnerHTML={{ __html: s.html }} />
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
