'use client';

import { useEffect, useId, useRef, useState, type ElementType, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '../icons';
import { focusRing } from '../button';
import { useControlled } from './use-controlled';

export type FeatureItem = {
  id: string;
  title: string;
  description: string;
  benefits: string[];
  image: { src: string; alt: string; width: 640; height: 420 };
};
export type FeatureExplorerProps = {
  items: FeatureItem[];
  tablistLabel: string;
  activeId?: string;
  onChange?: (id: string) => void;
  /** Componente de imagem (padrão `img`; o app pode passar `next/image`). Recebe src, alt, width, height, loading e className. */
  as?: ElementType;
  /** Legenda sob o painel de imagem (desktop). */
  caption?: ReactNode;
};

const EASE = 'ease-[cubic-bezier(.22,1,.36,1)]';

function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const m = window.matchMedia('(max-width: 767px)');
    const f = () => setNarrow(m.matches);
    f();
    m.addEventListener?.('change', f);
    return () => m.removeEventListener?.('change', f);
  }, []);
  return narrow;
}

/**
 * Explorador de recursos para fundo escuro (use dentro de `<Section tone="dark">`). Desktop: padrão WAI-ARIA de abas
 * (tabindex móvel, setas, Home/End, ativação automática) com a imagem num painel fixo à direita (`pop`, 400 ms).
 * Abaixo de 768 px vira acordeão (`aria-expanded`) com a imagem dentro do item.
 * Altura animada em 450 ms (grid-template-rows); movimento reduzido: sem transição.
 */
export function FeatureExplorer({ items, tablistLabel, activeId, onChange, as, caption }: FeatureExplorerProps) {
  const Img: ElementType = as ?? 'img';
  const uid = useId();
  const narrow = useNarrow();
  const [active, setActive] = useControlled(activeId, items[0]?.id ?? '');
  const [collapsed, setCollapsed] = useState(false);
  const tabs = useRef(new Map<string, HTMLButtonElement>());
  const current = items.find((i) => i.id === active) ?? items[0];
  if (!current) return null;

  const select = (id: string) => {
    setActive(id);
    setCollapsed(false);
    onChange?.(id);
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1;
    const to = { ArrowDown: (index + 1) % items.length, ArrowRight: (index + 1) % items.length, ArrowUp: (index + last) % items.length, ArrowLeft: (index + last) % items.length, Home: 0, End: last }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const target = items[to]!;
    tabs.current.get(target.id)?.focus();
    select(target.id);
  };
  const img = (it: FeatureItem, cls: string) => (
    <Img key={it.id} className={`pop block h-auto w-full ${cls}`} src={it.image.src} alt={it.image.alt} width={it.image.width} height={it.image.height} loading="lazy" />
  );
  const panelId = `${uid}-panel`;

  return (
    <div className="grid items-start gap-10 md:grid-cols-[5fr_6fr] md:gap-12">
      <div role={narrow ? undefined : 'tablist'} aria-label={narrow ? undefined : tablistLabel} className="flex flex-col gap-2.5">
        {items.map((it, index) => {
          const on = it.id === current.id;
          const open = narrow ? on && !collapsed : on;
          const body = `${uid}-body-${it.id}`;
          return (
            <div key={it.id} role={narrow ? undefined : 'presentation'} className={`rounded-[24px] border-[1.5px] px-2 py-1.5 transition-[background,border-color] duration-[250ms] ${on ? 'border-on-dark-line bg-on-dark-fill' : 'border-on-dark-line hover:bg-on-dark-fill'}`}>
              <button
                ref={(el) => { if (el) tabs.current.set(it.id, el); else tabs.current.delete(it.id); }}
                type="button"
                id={`${uid}-tab-${it.id}`}
                role={narrow ? undefined : 'tab'}
                aria-selected={narrow ? undefined : on}
                aria-expanded={narrow ? open : undefined}
                aria-controls={narrow ? body : panelId}
                tabIndex={narrow || on ? 0 : -1}
                onClick={() => (narrow && on ? setCollapsed((c) => !c) : select(it.id))}
                onKeyDown={narrow ? undefined : (e) => onKey(e, index)}
                className={`flex min-h-[60px] w-full cursor-pointer items-center gap-4 rounded-[18px] border-0 bg-transparent px-2.5 py-1.5 text-left text-on-dark ${focusRing}`}
              >
                <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold ${on ? 'bg-on-dark text-panel-dark' : 'bg-on-dark-fill text-on-dark'}`}>{index + 1}</span>
                <span className={`font-display text-[19px] font-bold tracking-[-0.02em] md:text-[22px] ${on ? '' : 'text-on-dark-muted-2'}`}>{it.title}</span>
              </button>
              <div id={body} role={narrow ? 'region' : undefined} aria-labelledby={narrow ? `${uid}-tab-${it.id}` : undefined} inert={!open} className={`grid transition-[grid-template-rows] duration-[450ms] ${EASE} ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="min-h-0 overflow-hidden">
                  <div className="flex flex-col gap-3 pt-1 pr-3.5 pb-4 pl-3.5 md:pl-[62px]">
                    <p className="m-0 text-base leading-[1.55] text-on-dark-muted-2">{it.description}</p>
                    <div className="flex flex-col gap-3">
                      {it.benefits.map((b) => (
                        <div key={b} className="flex items-start gap-2.5 text-[15px] leading-[1.45] text-on-dark">
                          <span className="mt-0.5 flex shrink-0 text-steady-on-dark"><Icon name="check" size={18} /></span>{b}
                        </div>
                      ))}
                    </div>
                    {narrow && open ? <div className="mt-2 rounded-[22px] bg-canvas p-3">{img(it, 'rounded-[16px]')}</div> : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {narrow ? null : (
        <div className="sticky top-[104px] flex flex-col gap-4">
          <div id={panelId} role="tabpanel" aria-labelledby={`${uid}-tab-${current.id}`} className="rounded-[34px] bg-canvas p-4 shadow-[0_40px_90px_rgba(0,0,0,0.3)]">
            {img(current, 'rounded-[20px]')}
          </div>
          {caption ? <p className="m-0 flex items-center gap-2.5 text-sm font-semibold text-on-dark-muted"><Icon name="layers" size={18} />{caption}</p> : null}
        </div>
      )}
    </div>
  );
}
