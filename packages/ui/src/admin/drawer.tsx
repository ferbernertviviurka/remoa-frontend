'use client';

import type { ReactNode } from 'react';
import * as RD from '@radix-ui/react-dialog';
import { focusRing, pressable } from '../button-styles';
import { Icon } from '../icons';
import { useReturnFocus } from '../return-focus';

/**
 * Drawer (F19 FR-14..FR-17): gaveta de detalhes pela direita (480 px, entra em 450 ms: `inright`). Radix Dialog: foco preso, Esc e clique fora fecham, foco volta à linha.
 * A sombra cobre só a área à direita da barra lateral de 264 px (como no mock). `title` (h2), `subtitle` (e-mail, data), `badge` (StatusPill), `closeLabel` do X de 44 px.
 * Corpo rola (`children`: DrawerFacts, DrawerTimeline, DrawerAuditTrail); `footer` fixo embaixo (DrawerActions). Sem `description` o leitor usa só o título.
 */
export type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  closeLabel: string;
  children?: ReactNode;
  footer?: ReactNode;
};

export function Drawer({ open, onOpenChange, title, subtitle, badge, closeLabel, children, footer }: DrawerProps) {
  const focus = useReturnFocus();
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="remoa-overlay fixed inset-y-0 left-[264px] right-0 z-50 bg-[rgba(26,21,51,.28)] max-lg:left-0" />
        <RD.Content {...focus} aria-describedby={undefined} className="inright fixed bottom-0 right-0 top-0 z-50 box-border flex w-[480px] max-w-full flex-col border-l border-border bg-surface text-ink shadow-[-24px_0_60px_rgba(36,26,92,.16)] outline-none">
          <div className="flex items-start justify-between gap-3 px-[26px] pb-4 pt-6">
            <div className="flex min-w-0 flex-col gap-1.5">
              <RD.Title className="m-0 font-display text-[26px] font-extrabold leading-[1.1] tracking-[-0.025em]">{title}</RD.Title>
              {subtitle ? <span className="text-sm text-muted">{subtitle}</span> : null}
              {badge ? <span>{badge}</span> : null}
            </div>
            <RD.Close aria-label={closeLabel} className={`flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-border bg-surface text-ink ${pressable} ${focusRing}`}>
              <Icon name="close" size={20} />
            </RD.Close>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-auto px-[26px] pb-[22px]">{children}</div>
          {footer ? <div className="flex flex-col gap-2.5 border-t border-border px-[26px] pb-6 pt-4">{footer}</div> : null}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

const sectionTitle = 'text-xs font-bold uppercase tracking-[0.12em] text-muted';

/** DrawerFacts: lista de pares rótulo/valor em cartão --canvas (raio 20). Semântica `<dl>`. */
export function DrawerFacts({ items }: { items: ReadonlyArray<{ k: string; v: ReactNode }> }) {
  return (
    <dl className="m-0 flex flex-col rounded-[20px] bg-canvas px-[18px] py-1">
      {items.map((x) => (
        <div key={x.k} className="flex justify-between gap-4 border-b border-border py-3 last:border-b-0">
          <dt className="shrink-0 text-sm text-muted">{x.k}</dt>
          <dd className="m-0 break-words text-right text-sm font-semibold">{x.v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** DrawerTimeline: linha do tempo (círculo 24 px com check quando `done`, texto, quando). Lista ordenada. */
export function DrawerTimeline({ title, steps }: { title: string; steps: ReadonlyArray<{ label: string; when?: string; done?: boolean }> }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2.5">
      <span aria-hidden="true" className={sectionTitle}>{title}</span>
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {steps.map((p) => (
          <li key={p.label} className="flex items-center gap-3 text-[14.5px]">
            <span aria-hidden="true" className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-white ${p.done === false ? 'border-border-strong bg-surface' : 'border-primary bg-primary'}`}>{p.done === false ? null : <Icon name="check" size={14} strokeWidth={2.4} />}</span>
            <span className="flex-1">{p.label}</span>
            {p.when ? <span className="text-[12.5px] text-muted">{p.when}</span> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** DrawerAuditTrail (FR-20): "Registrado agora na auditoria". Cada registro (id `a_1050` + texto) entra com `slide` (450 ms) e é anunciado (`aria-live`). */
export function DrawerAuditTrail({ title, entries }: { title: string; entries: ReadonlyArray<{ id: string; text: string }> }) {
  if (entries.length === 0) return null;
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <span aria-hidden="true" className={sectionTitle}>{title}</span>
      <div aria-live="polite" className="flex flex-col gap-2">
        {entries.map((t) => (
          <div key={t.id} className="slide flex gap-2.5 rounded-2xl bg-primary-tint px-3.5 py-3 text-[13.5px] leading-[1.45] text-primary-deep">
            <Icon name="shield" size={18} className="shrink-0" />
            <span><b>{t.id}</b> · {t.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** DrawerActions: rodapé com a regra ("Toda ação pede um motivo e fica registrada na auditoria.") e os botões de ação (`children`, Button). */
export function DrawerActions({ note, children }: { note: string; children: ReactNode }) {
  return (
    <>
      <span className="text-[12.5px] text-muted">{note}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </>
  );
}
