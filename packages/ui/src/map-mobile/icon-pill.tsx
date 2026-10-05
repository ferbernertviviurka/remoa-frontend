'use client';

import type { ReactNode } from 'react';
import { focusRing } from '../button-styles';

export type IconPillItem = {
  key: string;
  /** Rótulo acessível (botão só ícone). */
  label: string;
  icon: ReactNode;
  onClick: () => void;
  /** Desabilitado: 35% de opacidade, `aria-disabled` e sem clique (continua focável). */
  disabled?: boolean;
};

/**
 * IconPill (F23 FR-4/FR-11): pílula vertical escura de botões só ícone (desfazer e refazer; zoom +, −, ajustar).
 * `caption` = texto decorativo no rodapé (percentual do zoom), já formatado. Alvos 44 px.
 */
export type IconPillProps = { 'aria-label': string; items: IconPillItem[]; caption?: string };

export function IconPill({ 'aria-label': ariaLabel, items, caption }: IconPillProps) {
  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex flex-col rounded-[24px] bg-panel-dark p-1 text-on-dark shadow-[0_10px_24px_rgba(36,26,92,.25)]">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          aria-label={it.label}
          aria-disabled={it.disabled || undefined}
          onClick={() => { if (!it.disabled) it.onClick(); }}
          className={`flex size-11 cursor-pointer items-center justify-center rounded-[20px] transition-[opacity,transform] duration-150 active:scale-95 focus-visible:outline-offset-[-2px] aria-disabled:cursor-default aria-disabled:opacity-35 aria-disabled:active:scale-100 ${focusRing} focus-visible:outline-on-dark`}
        >
          {it.icon}
        </button>
      ))}
      {caption ? <span aria-hidden="true" className="pt-0.5 pb-1.5 text-center text-[11.5px] font-bold text-on-dark-muted">{caption}</span> : null}
    </div>
  );
}
