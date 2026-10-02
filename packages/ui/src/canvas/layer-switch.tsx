'use client';

import { clsx } from 'clsx';
import { focusRing } from '../button';
import { Icon } from '../icons';
import './canvas.css';

/**
 * LayerSwitch: barra flutuante "Camadas" (Estrutura / Lembrança / Cobertura). Grupo de botões `aria-pressed`;
 * a opção ativa é a cor `--panel-dark` com texto branco. Cada botão tem 38 px de altura (alvo < 44 px só na vertical do mock;
 * a barra tem 5 px de respiro). `label` é o texto "Camadas" (também o aria-label do grupo). Texto por props.
 */
export type LayerSwitchProps<V extends string = string> = {
  label: string;
  options: readonly { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
};

export function LayerSwitch<V extends string>({ label, options, value, onChange }: LayerSwitchProps<V>) {
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-1 rounded-[16px] border border-border bg-surface p-[5px] shadow-[0_8px_24px_rgba(36,26,92,.08)]">
      <span className="flex items-center gap-1.5 pl-2 pr-2.5 text-xs font-bold uppercase tracking-[.1em] text-muted">
        <Icon name="layers" size={18} />
        {label}
      </span>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'h-[38px] cursor-pointer rounded-[11px] px-[15px] text-[13px] font-bold',
            focusRing,
            o.value === value ? 'bg-(--cv-panel-dark) text-white' : 'bg-transparent text-(--cv-ink-2) hover:bg-primary-tint',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
