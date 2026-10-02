import type { ReactNode } from 'react';
import { GraphPreview } from '../graph-preview';
import { Icon } from '../icons';

/**
 * LockedSlideCard: cartão do limite do plano Free (F14 FR-14). 312 px, borda tracejada de 2 px, prévia fantasma (45%) com cadeado de 56 px sobre ela.
 * `title` ("Limite do plano Free"), `text` ("O Free permite até 2 mapas. Faça upgrade para criar o próximo.") e `cta` (slot: link/botão "Fazer upgrade" de 44 px, com ícone sparkle).
 * O cartão em si não é interativo; só o CTA.
 */
export type LockedSlideCardProps = { title: string; text: string; cta: ReactNode };

const ghost = {
  nodes: [
    { x: 0.435, y: 0.44, state: 'unknown' as const },
    { x: 0.14, y: 0.2, state: 'unknown' as const },
    { x: 0.77, y: 0.18, state: 'unknown' as const },
    { x: 0.1, y: 0.79, state: 'unknown' as const },
    { x: 0.38, y: 0.87, state: 'unknown' as const },
    { x: 0.7, y: 0.75, state: 'unknown' as const },
  ],
  edges: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]] as const,
};

export function LockedSlideCard({ title, text, cta }: LockedSlideCardProps) {
  return (
    <div className="box-border flex h-[312px] flex-col gap-3 rounded-list border-2 border-dashed border-border-strong bg-surface p-3.5 text-ink">
      <div className="relative shrink-0">
        <div className="opacity-45"><GraphPreview preview={ghost} height={120} /></div>
        <span className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-panel-dark text-on-dark shadow-[0_10px_24px_rgba(36,26,92,.3)]">
          <Icon name="lock" size={26} />
        </span>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 px-1.5 pb-1.5">
        <span title={title} className="line-clamp-1 font-display text-xl font-bold leading-[1.15] tracking-[-0.02em]">{title}</span>
        <span title={text} className="line-clamp-2 min-w-0 text-sm leading-[1.4] text-muted">{text}</span>
        <div className="mt-auto flex w-full flex-col [&>*]:min-h-11 [&>*]:w-full">{cta}</div>
      </div>
    </div>
  );
}
