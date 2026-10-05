'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { focusRing } from '../button-styles';

/**
 * InlineField: linha de configuração (rótulo, valor, botão "Editar"). Ao editar, a linha dá lugar ao formulário
 * (`children`, com animação `slide`); ao fechar, o foco volta ao botão. `children` pode ser função `({ close }) => ...`.
 * Aberto controlado (`open`/`onOpenChange`) ou não (`defaultOpen`). `onEdit` no lugar do formulário: o botão só chama
 * essa função (ex.: abrir o diálogo de foto). `status` = linha extra sob o valor (ex.: "Aguardando confirmação").
 * `editLabel` = texto do botão; `editAriaLabel` opcional para dizer o que edita ("Editar nome").
 */
export type InlineFieldProps = {
  label: string;
  value: ReactNode;
  editLabel: string;
  editAriaLabel?: string;
  /** Ícone decorativo antes do texto do botão. */
  editIcon?: ReactNode;
  status?: ReactNode;
  onEdit?: () => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode | ((api: { close: () => void }) => ReactNode);
};

export const secondaryButton = `flex h-11 items-center justify-center gap-2 rounded-[14px] border border-border-strong bg-surface px-[18px] text-sm font-bold text-ink hover:border-primary ${focusRing}`;

export function InlineField({ label, value, editLabel, editAriaLabel, editIcon, status, onEdit, open, defaultOpen = false, onOpenChange, children }: InlineFieldProps) {
  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;
  const btn = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(isOpen);
  const set = (v: boolean) => {
    if (open === undefined) setInner(v);
    onOpenChange?.(v);
  };
  useEffect(() => {
    if (wasOpen.current && !isOpen) btn.current?.focus();
    wasOpen.current = isOpen;
  }, [isOpen]);

  if (isOpen && children) {
    return (
      <div role="group" aria-label={label} className="slide flex flex-col gap-3 border-t border-divider py-[18px]">
        {typeof children === 'function' ? children({ close: () => set(false) }) : children}
      </div>
    );
  }
  return (
    <div className="grid min-h-[76px] items-center gap-x-4 gap-y-2 border-t border-divider py-3 sm:grid-cols-[190px_minmax(0,1fr)_auto] sm:py-0">
      <span className="font-semibold text-muted">{label}</span>
      <span className="flex min-w-0 flex-col gap-1.5 text-[17px] font-bold text-ink">
        {value}
        {status}
      </span>
      <button ref={btn} type="button" aria-label={editAriaLabel} onClick={() => (onEdit ? onEdit() : set(true))} className={secondaryButton}>
        {editIcon}
        {editLabel}
      </button>
    </div>
  );
}
