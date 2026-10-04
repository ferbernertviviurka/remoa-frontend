'use client';

import { useId, type KeyboardEvent, type ReactNode } from 'react';
import * as RD from '@radix-ui/react-dialog';
import { focusRing, pressable } from '../button';
import { Icon } from '../icons';
import { useReturnFocus } from '../return-focus';

export type SupportTab = { value: string; label: string; /** contador de não lidas (selo laranja); 0 ou ausente = sem selo */ count?: number };

/**
 * SupportModal (F19 FR-2): casca do suporte. `role="dialog"` + aria-modal (Radix), foco preso, Esc e clique fora fecham, foco volta a quem abriu.
 * 620 px, altura máxima `100vh - 64px`, raio 34, entrada `pop` (400 ms). Cabeçalho (`title`, `description`, X de 44 px com `closeLabel`) e abas opcionais
 * (`tabs` ausente = sem abas, ex.: tela de sucesso). O conteúdo (`children`) é o painel da aba ativa; quem usa troca o conteúdo conforme `activeTab`.
 * `dirty` + `onDirtyClose`: com texto não enviado, Esc/clique fora/X chamam `onDirtyClose` (abra a confirmação) em vez de fechar.
 * Regra de uso: não coloque ReasonDialog dentro; o modal é só do usuário comum.
 */
export type SupportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  closeLabel: string;
  tabsLabel?: string;
  tabs?: ReadonlyArray<SupportTab>;
  activeTab?: string;
  onTabChange?: (value: string) => void;
  dirty?: boolean;
  onDirtyClose?: () => void;
  children?: ReactNode;
};

export function SupportModal({ open, onOpenChange, title, description, closeLabel, tabsLabel, tabs, activeTab, onTabChange, dirty, onDirtyClose, children }: SupportModalProps) {
  const base = useId();
  const focus = useReturnFocus();
  const request = (next: boolean) => {
    if (!next && dirty && onDirtyClose) return onDirtyClose();
    onOpenChange(next);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!tabs || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End')) return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.value === activeTab);
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    const next = tabs[n];
    if (next) {
      onTabChange?.(next.value);
      document.getElementById(`${base}-tab-${next.value}`)?.focus();
    }
  };
  return (
    <RD.Root open={open} onOpenChange={request}>
      <RD.Portal>
        <RD.Overlay className="remoa-overlay fixed inset-0 z-50 bg-[rgba(26,21,51,.55)]" />
        <RD.Content {...focus} className="pop fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-64px)] w-[620px] max-w-[94%] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[34px] bg-surface text-ink shadow-[0_30px_90px_rgba(26,21,51,.45)] outline-none">
          <div className="flex items-start justify-between gap-4 px-7 pb-0 pt-[26px]">
            <div className="flex flex-col gap-1">
              <RD.Title className="m-0 font-display text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em]">{title}</RD.Title>
              <RD.Description className="m-0 text-[15px] text-muted">{description}</RD.Description>
            </div>
            <RD.Close aria-label={closeLabel} className={`flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-border bg-surface text-ink ${pressable} ${focusRing}`}>
              <Icon name="close" size={20} />
            </RD.Close>
          </div>
          {tabs ? (
            <div role="tablist" aria-label={tabsLabel} onKeyDown={onKey} className="flex gap-1 border-b border-border px-[22px] pt-4">
              {tabs.map((t) => {
                const on = t.value === activeTab;
                return (
                  <button
                    key={t.value}
                    id={`${base}-tab-${t.value}`}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    aria-controls={`${base}-panel`}
                    tabIndex={on ? 0 : -1}
                    onClick={() => onTabChange?.(t.value)}
                    className={`flex h-12 cursor-pointer items-center gap-2 border-b-[3px] bg-transparent px-3.5 text-[15px] transition-colors duration-200 ${on ? 'border-primary font-bold text-ink' : 'border-transparent font-semibold text-muted hover:text-ink'} ${focusRing}`}
                  >
                    {t.label}
                    {t.count ? <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-pill bg-review px-1.5 text-xs font-extrabold text-white">{t.count}</span> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
          <div id={`${base}-panel`} role={tabs ? 'tabpanel' : undefined} aria-labelledby={tabs && activeTab ? `${base}-tab-${activeTab}` : undefined} className="flex min-h-0 flex-1 flex-col overflow-auto">
            {children}
          </div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
