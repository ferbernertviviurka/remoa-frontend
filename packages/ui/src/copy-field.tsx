'use client';

import { useId, useState } from 'react';
import { Icon } from './icons';
import { focusRing, pressable } from './button';

/**
 * CopyField: campo só de leitura com botão "Copiar".
 * Usa `navigator.clipboard`; chama `onCopied` depois de copiar (o app exibe o toast).
 * Mostra o estado "Copiado" por 2 s, depois volta ao rótulo original.
 * Sem prop className (D-024). Todos os rótulos por prop.
 */
export interface CopyFieldProps {
  /** The read-only value displayed and copied */
  value: string;
  /** Visible label above the field */
  label: string;
  /** Button label in the default state */
  copyLabel: string;
  /** Button label shown for 2 s after copying */
  copiedLabel: string;
  /** Called after the clipboard write resolves */
  onCopied?: () => void;
}

export function CopyField({
  value,
  label,
  copyLabel,
  copiedLabel,
  onCopied,
}: CopyFieldProps) {
  const id = useId();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently ignore; the app can show an error via onCopied pattern if needed
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-bold text-ink">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-field border-[1.5px] border-border-strong bg-canvas pr-2">
        <input
          id={id}
          readOnly
          value={value}
          aria-readonly="true"
          className="min-h-[52px] flex-1 bg-transparent px-4 text-base font-semibold text-ink outline-none select-all"
        />
        <button
          type="button"
          onClick={handleCopy}
          aria-live="polite"
          className={[
            'flex min-h-11 min-w-[88px] shrink-0 items-center justify-center gap-1.5 rounded-[12px] px-3 text-sm font-bold transition-colors duration-150',
            copied
              ? 'bg-primary text-on-primary'
              : 'bg-primary-tint text-primary-deep hover:bg-primary hover:text-on-primary',
            pressable,
            focusRing,
          ].join(' ')}
        >
          <Icon
            name={copied ? 'check' : 'link'}
            size={16}
            strokeWidth={2}
            aria-hidden="true"
          />
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
    </div>
  );
}
