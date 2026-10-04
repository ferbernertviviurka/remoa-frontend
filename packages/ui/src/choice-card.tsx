'use client';

import type { ReactNode } from 'react';
import { focusRing } from './button-styles';
import { Icon, type IconName } from './icons';

/**
 * ChoiceCard: escolha única em cartão grande (caminho do Novo mapa: PDF, Anki, mapa pronto, em branco). <button aria-pressed>, mín. 176 px, raio 24,
 * borda 2 px; selecionado = borda --primary + anel de 5 px em tint, ícone cheio. `icon` (IconName), `tag` (pílula, ex.: "Rascunho por IA"), `title`, `description`.
 * Agrupe em `role="group" aria-label`.
 *
 * ChoiceRow: escolha em linha. `indicator` = radio (círculo) | check (quadradinho); `size` = md (52 px, raio 16, borda 1,5 px, fundo tint quando marcada; itens da matriz e opções)
 * | lg (cartão de 20 px de raio com `title` + `description`, e `badge` à direita, ex.: "Revisado"; mapas prontos). Texto: `children` (md) ou `title`/`description` (lg).
 */
export type ChoiceCardProps = { icon: IconName; tag: string; title: string; description: string; selected: boolean; onSelect: () => void };

export function ChoiceCard({ icon, tag, title, description, selected, onSelect }: ChoiceCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex sm:min-h-[176px] flex-col gap-2.5 rounded-review border-2 bg-surface p-5 text-left transition-[border-color,box-shadow] duration-150 ${
        selected ? 'border-primary shadow-[0_0_0_5px_var(--primary-tint)]' : 'border-border hover:border-border-strong'
      } ${focusRing}`}
    >
      <span className="flex items-center justify-between self-stretch">
        <span className={`flex size-12 items-center justify-center rounded-field ${selected ? 'bg-primary text-on-primary' : 'bg-primary-tint text-primary-deep'}`}>
          <Icon name={icon} />
        </span>
        <span className={`rounded-pill px-2.5 py-1 text-xs font-bold ${selected ? 'bg-primary-tint text-primary-deep' : 'bg-chip text-muted'}`}>{tag}</span>
      </span>
      <span className="font-display text-[22px] font-extrabold tracking-[-0.02em]">{title}</span>
      <span className="text-sm leading-[1.45] text-muted">{description}</span>
    </button>
  );
}

export type ChoiceRowProps = {
  selected: boolean;
  onSelect: () => void;
  indicator: 'radio' | 'check';
  size?: 'md' | 'lg';
  children?: ReactNode;
  title?: string;
  description?: string;
  badge?: string;
};

export function ChoiceRow({ selected, onSelect, indicator, size = 'md', children, title, description, badge }: ChoiceRowProps) {
  const lg = size === 'lg';
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex items-center gap-3 text-left text-ink transition-colors duration-150 ${
        lg ? 'gap-3.5 rounded-[20px] border-2 bg-surface px-[18px] py-4' : `min-h-[52px] rounded-field border-[1.5px] px-4 py-2 text-[15px] font-semibold ${selected ? 'bg-primary-tint' : 'bg-surface'}`
      } ${selected ? 'border-primary' : 'border-border'} ${focusRing}`}
    >
      <span
        aria-hidden="true"
        className={`flex size-6 shrink-0 items-center justify-center border-2 text-on-primary ${indicator === 'radio' ? 'rounded-full' : 'rounded-[7px]'} ${
          selected ? 'border-primary bg-primary' : 'border-unknown-soft bg-surface'
        }`}
      >
        {selected ? <Icon name="check" size={14} /> : null}
      </span>
      {lg ? (
        <>
          <span className="flex grow flex-col leading-[1.35]">
            <span className="font-display text-lg font-bold">{title}</span>
            {description ? <span className="text-[13px] font-normal text-muted">{description}</span> : null}
          </span>
          {badge ? <span className="rounded-pill bg-primary-tint px-2.5 py-1 text-xs font-bold text-primary-deep">{badge}</span> : null}
        </>
      ) : (
        children
      )}
    </button>
  );
}
