'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { focusRing } from '../button-styles';

/**
 * InspectorTabs: abas do painel do card (Conteúdo / Rubrica / Origem / Histórico). `role="tablist"` com tab ativa
 * `aria-selected`, foco móvel (roving tabindex) e setas/Home/End. Cada aba tem `id="{idPrefix}-tab-{id}"` e
 * `aria-controls="{idPrefix}-panel-{id}"`; renderize o conteúdo com `InspectorTabPanel` (mesmo `idPrefix`/`id`).
 * Aba ativa: sublinhado 3 px primário e texto --ink; inativa em muted. Altura 46 px. Texto por props.
 */
export type InspectorTabsProps<V extends string = string> = {
  'aria-label': string;
  idPrefix: string;
  tabs: readonly { id: V; label: string }[];
  value: V;
  onChange: (id: V) => void;
};

export function InspectorTabs<V extends string>({ 'aria-label': ariaLabel, idPrefix, tabs, value, onChange }: InspectorTabsProps<V>) {
  const list = useRef<HTMLDivElement>(null);
  const onKeyDown = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === value);
    const next = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next]!.id);
    list.current?.querySelectorAll<HTMLElement>('[role=tab]')[next]?.focus();
  };
  return (
    <div ref={list} role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown} className="flex border-b border-border px-3">
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${t.id}`}
            aria-controls={`${idPrefix}-panel-${t.id}`}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={clsx('h-[46px] flex-1 cursor-pointer border-b-[3px] px-1 text-[13.5px]', focusRing, on ? 'border-primary font-bold text-(--cv-ink)' : 'border-transparent font-semibold text-muted hover:text-(--cv-ink)')}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Painel de uma aba: `role="tabpanel"` ligado à aba por id. Renderize só o ativo. */
export function InspectorTabPanel({ idPrefix, id, children }: { idPrefix: string; id: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-tab-${id}`} tabIndex={0} className={`flex flex-col gap-4 ${focusRing}`}>
      {children}
    </div>
  );
}
