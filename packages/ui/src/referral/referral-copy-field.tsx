'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../icons';
import { focusRing } from '../button-styles';

/** Resultado do copiar: `clipboard` (API), `selection` (alternativa: texto selecionado + execCommand) ou `denied` (nada funcionou; o texto fica selecionado). */
export type CopyResult = 'clipboard' | 'selection' | 'denied';

export interface ReferralCopyFieldProps {
  /** Link exibido e copiado (só leitura) */
  value: string;
  /** Rótulo acessível do campo (invisível; o mock não mostra rótulo) */
  label: string;
  copyLabel: string;
  copiedLabel: string;
  /** Aviso quando a área de transferência é negada (FR-24); aparece abaixo, `role="alert"` */
  deniedLabel: string;
  /** Chamado a cada tentativa, com o resultado (telemetria `referral_link_copied`) */
  onCopy?: (result: CopyResult) => void;
  /** Quanto tempo o botão fica em "Copiado" (padrão 2200 ms, FR-4) */
  resetMs?: number;
}

/**
 * ReferralCopyField (F18 FR-4): caixa só de leitura + botão que vira índigo com check e "Copiado" por 2,2 s, anunciado por região `aria-live`.
 * Clipboard API; sem permissão, seleciona o texto e tenta `execCommand('copy')`; se também falhar, mostra `deniedLabel` e deixa o texto selecionado.
 * Não substitui `CopyField` (F17, campo com rótulo visível). Sem prop className (D-024).
 */
export function ReferralCopyField({ value, label, copyLabel, copiedLabel, deniedLabel, onCopy, resetMs = 2200 }: ReferralCopyFieldProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [copied, setCopied] = useState(false);
  const [denied, setDenied] = useState(false);
  useEffect(() => () => clearTimeout(timer.current), []);

  function done(result: CopyResult) {
    onCopy?.(result);
    if (result === 'denied') return setDenied(true);
    setDenied(false);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), resetMs);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      return done('clipboard');
    } catch {
      /* cai na alternativa de seleção */
    }
    input.current?.focus();
    input.current?.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    done(ok ? 'selection' : 'denied');
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch gap-2.5 max-sm:flex-col">
        <span className="flex h-[60px] min-w-0 flex-1 items-center gap-3 rounded-[18px] border-[1.5px] border-border-strong bg-canvas px-[18px] text-[17px] font-bold text-ink">
          <span className="flex text-primary-deep"><Icon name="link" size={22} /></span>
          <label htmlFor={id} className="sr-only">{label}</label>
          <input id={id} ref={input} readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="h-full min-w-0 flex-1 bg-transparent font-bold text-ink outline-none" />
        </span>
        <button
          type="button"
          onClick={copy}
          className={['lift flex h-[60px] w-[176px] shrink-0 items-center justify-center gap-2.5 rounded-[18px] text-base font-extrabold text-on-primary transition-colors duration-300 max-sm:w-full', copied ? 'bg-primary-deep' : 'bg-primary', focusRing].join(' ')}
        >
          <span key={copied ? 'ok' : 'copy'} className={copied ? 'pop flex' : 'flex'}><Icon name={copied ? 'check' : 'copy'} size={20} /></span>
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <span role="status" aria-live="polite" className="sr-only">{copied ? copiedLabel : ''}</span>
      {denied ? <span role="alert" className="text-[13px] font-semibold text-review-text">{deniedLabel}</span> : null}
    </div>
  );
}
