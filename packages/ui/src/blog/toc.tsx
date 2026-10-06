'use client';

import { useEffect, useState } from 'react';
import { Icon } from '../icons';
import { focusRing } from '../button-styles';

/**
 * Toc (F27): índice dos H2 e H3 (`items` vêm do `toc_json`; `id` = id do título no HTML).
 * - `inline` ("Neste artigo", Leitura): caixa de 700 px no começo do texto, sempre aberta.
 * - `side` (Guia): coluna fixa de 280 px (`position: sticky; top: 100px`) que destaca o H2 atual por IntersectionObserver, com transição de 200 ms
 *   (`aria-current="location"`). No celular fica recolhida num botão (`toggleLabel`, `aria-expanded`) acima do texto.
 * Movimento reduzido: o destaque troca sem transição. Sem JS ou sem IntersectionObserver a lista funciona como links âncora.
 */
export type TocItem = { id: string; title: string; level: 2 | 3 };
export type TocProps = { label: string; title: string; items: ReadonlyArray<TocItem>; variant?: 'inline' | 'side'; toggleLabel?: string };

function useActiveHeading(ids: string[], enabled: boolean) {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join('|');
  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return;
    const list = key ? key.split('|') : [];
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const first = list.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      { rootMargin: '-100px 0px -60% 0px' },
    );
    for (const id of list) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [key, enabled]);
  return active;
}

export function Toc({ label, title, items, variant = 'inline', toggleLabel }: TocProps) {
  const side = variant === 'side';
  const [open, setOpen] = useState(false);
  const active = useActiveHeading(items.filter((i) => i.level === 2).map((i) => i.id), side);
  if (items.length === 0) return null;
  return (
    <nav aria-label={label} className={`flex flex-col gap-0.5 rounded-[22px] border border-border bg-surface px-2.5 py-4 ${side ? 'lg:sticky lg:top-[100px]' : ''}`}>
      {side ? (
        <>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={`flex min-h-11 w-full items-center justify-between rounded-[10px] px-3 text-xs font-bold tracking-[0.12em] text-muted uppercase lg:hidden ${focusRing}`}
          >
            <span>{toggleLabel ?? title}</span>
            <span className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}><Icon name="right" size={16} aria-hidden="true" /></span>
          </button>
          <span className="hidden px-3 pt-1 pb-2 text-xs font-bold tracking-[0.12em] text-muted uppercase lg:block">{title}</span>
        </>
      ) : (
        <span className="px-3 pt-1 pb-2 text-xs font-bold tracking-[0.12em] text-muted uppercase">{title}</span>
      )}
      <ol className={`m-0 list-none flex-col gap-0.5 p-0 ${side && !open ? 'hidden lg:flex' : 'flex'}`}>
        {items.map((it) => {
          const on = side && active === it.id;
          return (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                aria-current={on ? 'location' : undefined}
                className={`flex min-h-11 items-center rounded-[10px] px-3 text-[15px] font-semibold no-underline transition-[background-color,color] duration-200 hover:bg-primary-tint hover:text-primary-deep lg:min-h-10 ${it.level === 3 ? 'pl-7 text-sm' : ''} ${on ? 'bg-primary-tint text-primary-deep' : 'text-ink-2'} ${focusRing}`}
              >
                {it.title}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
