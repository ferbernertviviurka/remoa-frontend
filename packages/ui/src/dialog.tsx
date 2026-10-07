'use client';

import type { ReactNode } from 'react';
import * as RD from '@radix-ui/react-dialog';
import { focusRing, pressable } from './button-styles';

/**
 * Dialog modal. Controlado (open/onOpenChange) ou com `trigger` (elemento que abre).
 * `title` obrigatório; `description` opcional; `closeLabel` = aria-label do botão fechar (vem de strings).
 */
export type DialogProps = {
  title: string;
  description?: string;
  closeLabel: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
  /** `full` = tela cheia (editores como o de máscaras). `lg` = 560 px, raio 30 (Conta); `xl` = 760 px (foto de perfil). Padrão `md` (480px). `form` (600 px) e `tour` (720 px) = como `bare`, para o modal de compromisso e o tutorial do Calendário (F25). `bare` = sem cartão, sem botão de fechar (o conteúdo traz o próprio cartão e as ações; Esc ainda fecha). */
  size?: 'md' | 'lg' | 'xl' | 'full' | 'bare' | 'form' | 'tour';
  /** ícone em quadro (só `lg`, estilo da Conta) */
  icon?: ReactNode;
  /** título e descrição só para leitor de tela (o conteúdo já tem o próprio título visível; ex.: sucesso do Pro) */
  srOnlyHeader?: boolean;
};

const sizes = {
  md: 'remoa-dialog left-1/2 top-1/2 max-h-[92vh] w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-review p-6',
  lg: 'remoa-dialog left-1/2 top-[min(140px,8vh)] w-[min(92vw,560px)] -translate-x-1/2 rounded-[30px] p-7',
  xl: 'remoa-dialog left-1/2 top-[min(70px,5vh)] max-h-[92vh] w-[min(92vw,760px)] -translate-x-1/2 overflow-y-auto rounded-[30px] p-7',
  full: 'remoa-sheet inset-0 flex flex-col overflow-hidden p-6',
  bare: 'remoa-dialog left-1/2 top-1/2 max-h-[96vh] w-[min(96vw,540px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto outline-none',
  form: 'remoa-dialog left-1/2 top-1/2 max-h-[96vh] w-[min(96vw,600px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto outline-none',
  tour: 'remoa-dialog left-1/2 top-1/2 max-h-[96vh] w-[min(94vw,720px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto outline-none',
};

export function Dialog({ title, description, closeLabel, trigger, children, size = 'md', icon, srOnlyHeader, ...root }: DialogProps) {
  return (
    <RD.Root {...root}>
      {trigger ? <RD.Trigger asChild>{trigger}</RD.Trigger> : null}
      <RD.Portal>
        <RD.Overlay className={`remoa-overlay fixed inset-0 z-50 ${size === 'lg' || size === 'xl' || size === 'bare' || size === 'form' || size === 'tour' ? 'bg-[rgba(26,21,51,.6)]' : 'bg-navy/55 backdrop-blur-[3px]'}`} />
        <RD.Content className={`fixed z-50 ${sizes[size]} ${(size === 'bare' || size === 'form' || size === 'tour') ? 'text-text' : 'border border-border bg-surface text-text shadow-lift'}`}>
          {icon ? <span className="mb-3.5 flex size-[52px] items-center justify-center rounded-[16px] bg-review-bg text-review-text">{icon}</span> : null}
          <RD.Title className={srOnlyHeader ? 'sr-only' : size === 'lg' || size === 'xl' ? 'pr-10 font-display text-[26px] font-extrabold tracking-[-0.025em]' : 'pr-10 font-display text-lg font-bold'}>{title}</RD.Title>
          {description ? (
            <RD.Description className={srOnlyHeader ? 'sr-only' : 'mt-1 text-sm text-muted'}>{description}</RD.Description>
          ) : null}
          <div className={size === 'full' ? 'mt-4 flex min-h-0 flex-1 flex-col' : (size === 'bare' || size === 'form' || size === 'tour') ? '' : 'mt-4'}>{children}</div>
          {(size === 'bare' || size === 'form' || size === 'tour') ? null : (
          <RD.Close
            aria-label={closeLabel}
            className={`absolute flex h-11 w-11 items-center justify-center rounded-btn text-muted hover:bg-primary-tint ${size === 'xl' ? 'right-7 top-7 border border-border bg-surface text-ink' : 'right-3 top-3'} ${pressable} ${focusRing}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </RD.Close>
          )}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
