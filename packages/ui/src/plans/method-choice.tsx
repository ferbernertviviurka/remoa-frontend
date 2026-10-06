'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { focusRing } from '../button-styles';
import { Icon } from '../icons';
import { Pill } from '../pill';

/**
 * MethodChoice: forma de pagamento (Pix | Cartão) em cartões, radiogroup acessível (setas movem a seleção; Tab entra no marcado).
 * `label` nomeia o grupo. Cada opção: value, label, description, icon (nó decorativo); `disabled` tira do clique e das setas,
 * `badge` mostra uma pílula ao lado do nome (ex.: "Em breve"). Transição de 200 ms, mín. 104 px de altura.
 */
export type MethodOption = { value: string; label: string; description: string; icon: ReactNode; disabled?: boolean; badge?: string };
export type MethodChoiceProps = { label: string; options: ReadonlyArray<MethodOption>; value: string; onChange: (value: string) => void };

export function MethodChoice({ label, options, value, onChange }: MethodChoiceProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const move = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    let n = i;
    do n = (n + d + options.length) % options.length;
    while (options[n]!.disabled && n !== i);
    onChange(options[n]!.value);
    refs.current[n]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2.5">
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={o.disabled}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => move(e, i)}
            className={`flex min-h-[104px] min-w-0 flex-col items-start gap-1.5 rounded-[18px] border-2 p-3.5 text-left text-ink transition-[background-color,border-color] duration-200 ease-out ${
              on ? 'border-primary bg-primary-tint' : o.disabled ? 'cursor-not-allowed border-border bg-canvas opacity-70' : 'border-border bg-surface hover:border-border-strong'
            } ${focusRing}`}
          >
            <span className="flex w-full items-center justify-between">
              <span aria-hidden="true" className={`flex ${on ? 'text-primary-deep' : 'text-muted'}`}>{o.icon}</span>
              {o.disabled ? null : (
                <span aria-hidden="true" className={`flex size-[22px] items-center justify-center rounded-full border-2 text-on-primary transition-colors duration-200 ${on ? 'border-primary bg-primary' : 'border-border-strong bg-surface'}`}>
                  {on ? <Icon name="check" size={13} /> : null}
                </span>
              )}
            </span>
            <span className="flex flex-wrap items-center gap-2 text-base font-bold">
              {o.label}
              {o.badge ? <Pill tone="unknown">{o.badge}</Pill> : null}
            </span>
            <span className="text-[12.5px] leading-[1.35] text-muted">{o.description}</span>
          </button>
        );
      })}
    </div>
  );
}
