'use client';

import { useEffect, useId, useRef, type FormEvent } from 'react';
import { focusRing } from '../button';

export type WaitlistState = 'idle' | 'submitting' | 'error' | 'success';
export type WaitlistValues = { email: string; segment: string; honeypot: string };
export type WaitlistFormProps = {
  state: WaitlistState;
  email: string;
  onEmailChange: (v: string) => void;
  segment: string;
  onSegmentChange: (v: string) => void;
  /** Disparado no envio nativo do formulário; o app valida e chama `joinWaitlist`. Sem fetch aqui. */
  onSubmit: (values: WaitlistValues) => void;
  emailLabel: string;
  emailPlaceholder: string;
  segmentLabel: string;
  segments: ReadonlyArray<{ value: string; label: string }>;
  submitLabel: string;
  /** Texto do botão enquanto envia (padrão: o mesmo do envio). */
  submittingLabel?: string;
  error?: string;
  successTitle: string;
  successText: string;
  resetLabel: string;
  onReset: () => void;
  /** Nome do campo-isca (padrão "website"). Rótulo próprio para leitor de tela evita preenchimento por pessoas. */
  honeypotName?: string;
  honeypotLabel: string;
};

/**
 * Formulário da lista de espera para fundo escuro. Só visual e controlado: o app guarda e-mail/segmento e o estado.
 * Honeypot oculto (fora da tela, `tabindex=-1`, `aria-hidden`): se vier preenchido em `onSubmit`, o app descarta em silêncio.
 * Sucesso: anel que se desenha (900 ms) + check (500 ms, atraso 750 ms), `role=status` `aria-live=polite`, recebe o foco.
 */
export function WaitlistForm(p: WaitlistFormProps) {
  const uid = useId();
  const success = useRef<HTMLDivElement>(null);
  useEffect(() => { if (p.state === 'success') success.current?.focus(); }, [p.state]);

  if (p.state === 'success') {
    return (
      <div ref={success} tabIndex={-1} role="status" aria-live="polite" className="pop flex flex-col items-center gap-3 rounded-2xl text-center text-on-dark outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-steady-on-dark">
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
          <circle cx="48" cy="48" r="34" fill="rgba(201,191,255,.2)" />
          <circle className="draw" cx="48" cy="48" r="42" stroke="#C9BFFF" strokeWidth="6" strokeLinecap="round" transform="rotate(-90 48 48)" />
          <path className="drawc" d="M34 49l10 10 19-23" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-display text-[32px] font-extrabold tracking-[-0.03em]">{p.successTitle}</span>
        <span className="text-[17px] text-on-dark-muted-2">{p.successText}</span>
        <button type="button" onClick={p.onReset} className={`h-11 cursor-pointer rounded-lg border-0 bg-transparent px-1.5 text-[15px] font-bold text-steady-on-dark underline ${focusRing}`}>{p.resetLabel}</button>
      </div>
    );
  }

  const busy = p.state === 'submitting';
  const failed = p.state === 'error' && !!p.error;
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const hp = new FormData(e.currentTarget).get(p.honeypotName ?? 'website');
    p.onSubmit({ email: p.email, segment: p.segment, honeypot: typeof hp === 'string' ? hp : '' });
  };
  return (
    <form onSubmit={submit} noValidate aria-busy={busy} className="flex w-full max-w-[640px] flex-col gap-3.5">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <label htmlFor={`${uid}-email`} className="sr-only">{p.emailLabel}</label>
        <input
          id={`${uid}-email`} name="email" type="email" autoComplete="email" inputMode="email" required
          value={p.email} onChange={(e) => p.onEmailChange(e.target.value)} placeholder={p.emailPlaceholder}
          aria-invalid={failed || undefined} aria-describedby={failed ? `${uid}-err` : undefined}
          className={`h-[60px] min-w-0 sm:flex-1 rounded-[18px] border-2 bg-surface px-5 text-[17px] font-semibold text-ink placeholder:text-muted ${failed ? 'border-review-on-dark' : 'border-transparent'} ${focusRing}`}
        />
        <button type="submit" disabled={busy} className={`lift h-[60px] cursor-pointer rounded-[18px] border-0 bg-primary px-[26px] text-[17px] font-extrabold whitespace-nowrap text-on-primary disabled:cursor-progress disabled:opacity-70 ${focusRing}`}>
          {busy ? (p.submittingLabel ?? p.submitLabel) : p.submitLabel}
        </button>
      </div>
      {failed ? <span id={`${uid}-err`} role="alert" className="text-left text-sm font-semibold text-review-on-dark">{p.error}</span> : null}
      <fieldset className="m-0 flex min-w-0 flex-wrap justify-center gap-2 border-0 p-0">
        <legend className="sr-only">{p.segmentLabel}</legend>
        {p.segments.map((s) => (
          <label key={s.value} className="relative">
            <input type="radio" name="segment" value={s.value} checked={p.segment === s.value} onChange={() => p.onSegmentChange(s.value)} className="peer sr-only" />
            <span className="flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-on-dark-line bg-transparent px-[18px] text-sm font-bold text-on-dark transition-[background,border-color] duration-200 peer-checked:border-on-dark peer-checked:bg-on-dark peer-checked:text-panel-dark peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-steady-on-dark">{s.label}</span>
          </label>
        ))}
      </fieldset>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>{p.honeypotLabel}<input name={p.honeypotName ?? 'website'} type="text" tabIndex={-1} autoComplete="off" defaultValue="" /></label>
      </div>
    </form>
  );
}
