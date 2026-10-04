'use client';

import { useId, useState, type ReactNode } from 'react';
import * as RD from '@radix-ui/react-dialog';
import { Button, fieldControl, focusRing } from '../button';
import { useReturnFocus } from '../return-focus';

/**
 * ReasonDialog (F19 FR-20): toda ação sensível do admin passa por aqui. `role="alertdialog"` (Radix Dialog), foco preso, Esc cancela, 520 px, `pop` (400 ms).
 * Mostra o `summary` do que vai acontecer e o campo `reasonLabel` ("Motivo (obrigatório)", ≥ `minLength` caracteres, padrão 8, contando sem espaços nas pontas).
 * Confirmar com motivo curto não chama nada: mostra `tooShortText` (aria-invalid + alerta). `onConfirm(reason)` devolve `{ auditId }` (a API já gravou a auditoria na mesma transação);
 * então o diálogo mostra `receiptText(auditId)` ("Ação registrada na auditoria (a_1050)", `role="status"`) e só `doneLabel` fecha; `onConfirmed(auditId)` avisa a tela (ex.: acrescentar na gaveta).
 * Se `onConfirm` rejeitar, mostra `errorText` e mantém o motivo digitado. `danger` = botão laranja (excluir, reembolsar, suspender). Nenhuma ação roda sem passar por este diálogo (`withAdmin` no servidor é a trava real).
 */
export type ReasonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  summary: string;
  reasonLabel: string;
  tooShortText: string;
  errorText: string;
  confirmLabel: string;
  cancelLabel: string;
  doneLabel: string;
  receiptText: (auditId: string) => string;
  onConfirm: (reason: string) => Promise<{ auditId: string }>;
  onConfirmed?: (auditId: string) => void;
  minLength?: number;
  danger?: boolean;
  /** conteúdo extra acima do motivo (ex.: caixa "Conferi no Stripe"); some depois de confirmar */
  children?: ReactNode;
  /** trava o botão Confirmar (ex.: a caixa acima ainda não foi marcada) */
  confirmDisabled?: boolean;
};

export function ReasonDialog({ open, onOpenChange, title, summary, reasonLabel, tooShortText, errorText, confirmLabel, cancelLabel, doneLabel, receiptText, onConfirm, onConfirmed, minLength = 8, danger, children, confirmDisabled }: ReasonDialogProps) {
  const id = useId();
  const focus = useReturnFocus();
  const [reason, setReason] = useState('');
  const [state, setState] = useState<'idle' | 'short' | 'pending' | 'error' | 'done'>('idle');
  const [auditId, setAuditId] = useState('');
  const change = (next: boolean) => {
    if (state === 'pending') return;
    if (!next) { setReason(''); setState('idle'); setAuditId(''); }
    onOpenChange(next);
  };
  const confirm = async () => {
    if (reason.trim().length < minLength) return setState('short');
    setState('pending');
    try {
      const r = await onConfirm(reason.trim());
      setAuditId(r.auditId);
      setState('done');
      onConfirmed?.(r.auditId);
    } catch {
      setState('error');
    }
  };
  const done = state === 'done';
  const invalid = state === 'short';
  return (
    <RD.Root open={open} onOpenChange={change}>
      <RD.Portal>
        <RD.Overlay className="remoa-overlay fixed inset-0 z-[60] bg-[rgba(26,21,51,.55)]" />
        <RD.Content {...focus} role="alertdialog" className="pop fixed left-1/2 top-1/2 z-[60] box-border flex w-[520px] max-w-[94%] -translate-x-1/2 -translate-y-1/2 flex-col gap-3.5 rounded-[30px] bg-surface p-7 text-ink shadow-[0_30px_80px_rgba(26,21,51,.4)] outline-none">
          <RD.Title className="m-0 font-display text-[26px] font-extrabold tracking-[-0.025em]">{title}</RD.Title>
          <RD.Description className="m-0 text-[15px] leading-normal text-muted">{summary}</RD.Description>
          {done ? (
            <>
              <p role="status" className="slide m-0 rounded-2xl bg-primary-tint px-3.5 py-3 text-[14.5px] font-semibold text-primary-deep">{receiptText(auditId)}</p>
              <div className="flex justify-end"><Button onClick={() => change(false)}>{doneLabel}</Button></div>
            </>
          ) : (
            <>
              {children}
              <div className="flex flex-col gap-2">
                <label htmlFor={id} className="font-bold">{reasonLabel}</label>
                <textarea id={id} rows={3} value={reason} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-err` : undefined} disabled={state === 'pending'} onChange={(e) => { setReason(e.target.value); if (state === 'short' || state === 'error') setState('idle'); }} className={`resize-none rounded-btn py-3 text-[15px] font-normal leading-[1.45] ${fieldControl} ${invalid ? 'border-review' : ''} ${focusRing}`} />
                {invalid ? <span id={`${id}-err`} role="alert" className="text-[13px] font-semibold text-review-text">{tooShortText}</span> : null}
                {state === 'error' ? <span role="alert" className="text-[13px] font-semibold text-review-text">{errorText}</span> : null}
              </div>
              <div className="flex justify-end gap-2.5">
                <Button variant="secondary" disabled={state === 'pending'} onClick={() => change(false)}>{cancelLabel}</Button>
                <Button variant={danger ? 'danger' : 'primary'} loading={state === 'pending'} disabled={confirmDisabled} onClick={confirm}>{confirmLabel}</Button>
              </div>
            </>
          )}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
