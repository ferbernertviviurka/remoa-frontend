'use client';

import { useEffect, useRef, useState } from 'react';
import { focusRing } from '../button-styles';
import { MapGlyph } from './glyph';

/** Faixa âmbar do modo conectar (F23 FR-10, Q-086): "Toque no card que se liga a …" + cancelar (44 px). */
export function ConnectBanner({ text, cancelLabel, onCancel }: { text: string; cancelLabel: string; onCancel: () => void }) {
  return (
    <div role="status" className="pop absolute inset-x-[78px] top-[calc(112px+env(safe-area-inset-top))] z-[25] flex items-center gap-2 rounded-[18px] border-[1.5px] border-[#FCD34D] bg-[#FEF3C7] py-2 pr-2 pl-3.5 text-[13px] leading-tight font-bold text-[#854D0E]">
      <span className="grow">{text}</span>
      <button type="button" aria-label={cancelLabel} onClick={onCancel} className={`-my-2 flex size-11 shrink-0 cursor-pointer items-center justify-center text-[#854D0E] ${focusRing}`}>
        <MapGlyph name="close" size={18} />
      </button>
    </div>
  );
}

export type EdgeLabelFieldProps = {
  /** Nome acessível do grupo ("Rótulo da conexão"). */
  ariaLabel: string;
  inputLabel: string;
  placeholder: string;
  initial?: string;
  saveLabel: string;
  skipLabel: string;
  maxLength?: number;
  onSave: (label: string) => void;
  onSkip: () => void;
};

/** Campo de rótulo da conexão recém-criada (ou existente): salvar ou pular. Esc pula; foco no campo ao abrir. */
export function EdgeLabelField(p: EdgeLabelFieldProps) {
  const [v, setV] = useState(p.initial ?? '');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <form
      aria-label={p.ariaLabel}
      onSubmit={(e) => { e.preventDefault(); p.onSave(v.trim()); }}
      onKeyDown={(e) => { if (e.key === 'Escape') p.onSkip(); }}
      className="pop absolute inset-x-3 bottom-[calc(104px+env(safe-area-inset-bottom))] z-[36] flex flex-col gap-2.5 rounded-[28px] bg-surface p-4 shadow-[0_22px_50px_rgba(36,26,92,.28)]"
    >
      <input
        ref={ref}
        value={v}
        onChange={(e) => setV(e.target.value)}
        maxLength={p.maxLength ?? 120}
        aria-label={p.inputLabel}
        placeholder={p.placeholder}
        enterKeyHint="done"
        className={`h-12 w-full rounded-[15px] border-[1.5px] border-border-strong bg-surface px-3.5 text-base text-ink placeholder:text-muted ${focusRing}`}
      />
      <div className="flex gap-2">
        <button type="button" onClick={p.onSkip} className={`flex h-12 grow cursor-pointer items-center justify-center rounded-[15px] border-[1.5px] border-border-strong bg-surface text-[15px] font-bold text-ink ${focusRing}`}>{p.skipLabel}</button>
        <button type="submit" className={`flex h-12 grow cursor-pointer items-center justify-center rounded-[15px] bg-primary text-[15px] font-extrabold text-on-primary ${focusRing}`}>{p.saveLabel}</button>
      </div>
    </form>
  );
}
