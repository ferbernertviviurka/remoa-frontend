'use client';

import type { ReactNode } from 'react';
import { IconButton } from './icon-button';
import { Icon } from './icons';

/**
 * AnswerGroup + AnswerOption: alternativas de uma questão objetiva. `<input type="radio">` nativo (setas, Tab e leitor de tela de graça)
 * dentro de `role="radiogroup"`. Linha inteira clicável (mín. 56 px), letra em selo que vira roxo cheio ao marcar, anel e ponto à direita
 * que crescem com transição (desligada em movimento reduzido pelo motion.css). `state="correct"` pinta a correção (modo estudo).
 * `onToggleEliminate` mostra o botão de riscar a alternativa (`eliminateLabel` = aria-label, `eliminated` = riscada).
 */
export function AnswerGroup({ label, children }: { label: string; children: ReactNode }) {
  return <div role="radiogroup" aria-label={label} className="flex min-w-0 flex-col gap-3">{children}</div>;
}

export type AnswerOptionProps = {
  name: string;
  value: string;
  letter: string;
  children: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  state?: 'default' | 'correct';
  eliminated?: boolean;
  eliminateLabel?: string;
  onToggleEliminate?: () => void;
};

export function AnswerOption({ name, value, letter, children, checked, disabled, onSelect, state = 'default', eliminated = false, eliminateLabel, onToggleEliminate }: AnswerOptionProps) {
  const tone = state === 'correct'
    ? 'border-steady bg-steady-bg'
    : checked
      ? 'border-primary bg-primary-tint shadow-[0_0_0_4px_var(--primary-tint)]'
      : 'border-border bg-surface hover:border-border-strong hover:bg-soft';
  return (
    <div
      data-checked={checked || undefined}
      className={`flex min-w-0 items-center gap-1 rounded-field border-[1.5px] pr-1.5 transition-[border-color,background-color,box-shadow] duration-200 ease-out has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-primary ${tone}`}
    >
      <label className={`flex min-h-14 min-w-0 flex-1 items-center gap-3.5 py-3 pl-3.5 ${disabled ? 'cursor-default' : 'cursor-pointer'} ${eliminated ? 'opacity-50' : ''}`}>
        <input type="radio" className="sr-only" name={name} value={value} checked={checked} disabled={disabled} onChange={onSelect} />
        <span
          aria-hidden="true"
          className={`flex size-9 shrink-0 items-center justify-center rounded-[11px] font-display text-[15px] font-extrabold transition-[background-color,color,transform] duration-200 ease-out ${checked ? 'scale-105 bg-primary text-on-primary' : 'bg-primary-tint text-primary-deep'}`}
        >
          {letter}
        </span>
        <span className={`min-w-0 flex-1 whitespace-pre-wrap break-words text-[15px] leading-6 text-ink ${eliminated ? 'line-through' : ''}`}>{children}</span>
        <span aria-hidden="true" className={`flex size-6 shrink-0 items-center justify-center rounded-pill border-2 transition-colors duration-200 ${checked ? 'border-primary' : 'border-border-strong'}`}>
          <span className={`size-3 rounded-pill bg-primary transition-transform duration-200 ease-out ${checked ? 'scale-100' : 'scale-0'}`} />
        </span>
      </label>
      {onToggleEliminate && eliminateLabel ? (
        <IconButton aria-label={eliminateLabel} aria-pressed={eliminated} size="md" onClick={onToggleEliminate}>
          <Icon name="close" size={18} />
        </IconButton>
      ) : null}
    </div>
  );
}
