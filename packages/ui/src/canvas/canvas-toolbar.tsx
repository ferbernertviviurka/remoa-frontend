'use client';

import { clsx } from 'clsx';
import { Tooltip } from '../tooltip';
import { Icon, type IconName } from '../icons';
import './canvas.css';

export type ToolbarItem = { id: string; icon: IconName; label: string; hint?: string; pressed?: boolean; disabled?: boolean } | { separator: true };

/**
 * CanvasToolbar: barra de ferramentas escura (`--panel-dark`, raio 22) com `role="toolbar"`. Cada ferramenta é um botão 44×44
 * só-ícone: `label` vira aria-label; `hint` (nome + explicação curta) abre num Tooltip no hover e no foco (sem title nativo). `pressed` marca a ferramenta ativa (aria-pressed, fundo branco 20%).
 * `{ separator: true }` desenha o divisor. Setas esquerda/direita movem o foco entre as ferramentas. Texto por props.
 */
export type CanvasToolbarProps = {
  'aria-label': string;
  items: readonly ToolbarItem[];
  onSelect: (id: string) => void;
};

export function CanvasToolbar({ 'aria-label': ariaLabel, items, onSelect }: CanvasToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const btns = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        const i = btns.indexOf(document.activeElement as HTMLButtonElement);
        if (i < 0) return;
        e.preventDefault();
        btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length]?.focus();
      }}
      className="inline-flex items-center gap-1 rounded-[22px] bg-(--cv-panel-dark) p-2"
    >
      {items.map((it, i) =>
        'separator' in it ? (
          <span key={`sep${i}`} aria-hidden="true" className="mx-1.5 h-[26px] w-px bg-white/20" />
        ) : (
          <Tooltip key={it.id} label={it.hint ?? it.label}>
          <button
            type="button"
            aria-label={it.label}
            aria-pressed={!!it.pressed}
            disabled={it.disabled}
            onClick={() => onSelect(it.id)}
            className={clsx(
              'flex size-11 cursor-pointer items-center justify-center rounded-[14px] text-white hover:bg-white/10 disabled:opacity-40',
              it.pressed && 'bg-white/20 hover:bg-white/20',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
            )}
          >
            <Icon name={it.icon} size={22} />
          </button>
          </Tooltip>
        ),
      )}
    </div>
  );
}
