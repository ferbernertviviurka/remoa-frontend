'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '../button';
import { focusRing } from '../button-styles';
import { Icon } from '../icons';
import { Input } from '../input';

/**
 * CouponField: disclosure ("Tenho um código de fundador") que abre o campo e leva o foco a ele. "Aplicar" chama `onApply(code)`
 * (assíncrono; o servidor valida): `true` = aplicado (o pai passa `applied`), `false` = mostra `errorMessage`.
 * `applied` troca tudo pelo chip `appliedLabel` com `removeLabel` (chama `onRemove`). Todo texto vem por props.
 */
export type CouponFieldProps = {
  toggleLabel: string;
  inputLabel: string;
  placeholder?: string;
  applyLabel: string;
  appliedLabel: string;
  removeLabel: string;
  errorMessage: string;
  applied: boolean;
  onApply: (code: string) => Promise<boolean>;
  onRemove: () => void;
};

export function CouponField(p: CouponFieldProps) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const panel = useId();
  const wrap = useRef<HTMLDivElement>(null);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) queueMicrotask(() => wrap.current?.querySelector('input')?.focus());
  };
  const apply = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(false);
    try {
      const ok = await p.onApply(code.trim());
      if (!ok) setError(true);
      else { setOpen(false); setCode(''); }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  if (p.applied) {
    return (
      <div className="slide flex items-center gap-2.5 rounded-field bg-primary-tint py-2.5 pl-3.5 pr-3 text-primary-deep">
        <Icon name="sparkle" size={20} />
        <span className="grow text-sm font-bold">{p.appliedLabel}</span>
        <button type="button" onClick={p.onRemove} className={`min-h-11 rounded-lg px-2.5 text-[13px] font-bold underline ${focusRing}`}>{p.removeLabel}</button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      <button type="button" aria-expanded={open} aria-controls={panel} onClick={toggle} className={`flex min-h-12 w-full items-center justify-between rounded-lg px-1 text-[15px] font-bold text-primary-deep ${focusRing}`}>
        <span>{p.toggleLabel}</span>
        <span aria-hidden="true" className={`flex transition-transform duration-300 ${open ? 'rotate-180' : ''}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg></span>
      </button>
      <div id={panel} ref={wrap} hidden={!open} className="slide flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <div className="min-w-0 grow">
            <Input label={p.inputLabel} placeholder={p.placeholder} value={code} aria-invalid={error} onChange={(e) => { setCode(e.target.value); setError(false); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void apply(); } }} />
          </div>
          <Button variant="primary" size="lg" disabled={busy || !code.trim()} onClick={() => void apply()}>{p.applyLabel}</Button>
        </div>
        {error ? <span role="alert" className="text-[13px] font-semibold text-review-text">{p.errorMessage}</span> : null}
      </div>
    </div>
  );
}
