import { focusRing } from '../button';
import { Icon } from '../icons';
import type { SlideLink } from './link';

/**
 * NewMapSlideCard: cartão em branco do carrossel e do fim da grade (F14 FR-13). 312 px, borda tracejada de 2 px na marca, fundo --primary-tint,
 * círculo de 76 px com "+". `title` ("Novo mapa"), `text` ("Comece do zero, de um PDF ou do seu Anki." / "Você ainda pode criar 1 mapa no plano Free."),
 * `aria-label` ("Criar um novo mapa") e `href` ("/mapas/novo") obrigatórios; `as` troca o link.
 */
export type NewMapSlideCardProps = { href: string; as?: SlideLink; 'aria-label': string; title: string; text: string };

export function NewMapSlideCard({ href, as, 'aria-label': ariaLabel, title, text }: NewMapSlideCardProps) {
  const As: SlideLink = as ?? 'a';
  return (
    <As href={href} aria-label={ariaLabel} className={`lift box-border flex h-[312px] flex-col gap-3 rounded-list border-2 border-dashed border-primary bg-primary-tint p-3.5 text-ink no-underline ${focusRing}`}>
      <span className="flex grow items-center justify-center">
        <span className="flex size-[76px] items-center justify-center rounded-full bg-surface text-primary-deep"><Icon name="plus" size={34} /></span>
      </span>
      <span className="flex flex-col gap-1.5 px-1.5 pb-2">
        <span className="font-display text-[21px] font-bold tracking-[-0.02em]">{title}</span>
        <span title={text} className="line-clamp-2 min-w-0 text-sm leading-[1.45] text-muted">{text}</span>
      </span>
    </As>
  );
}
