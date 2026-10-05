'use client';

import type { ReactNode } from 'react';
import { BottomSheet } from './bottom-sheet';
import { Icon, type IconName } from '../icons';
import { focusRing } from '../button-styles';

/** As 8 opções do bottom sheet "Criar card" (F23 FR-13). */
export type CreateCardKind = 'concept' | 'flowchart' | 'case' | 'image' | 'photo' | 'ai' | 'pdf' | 'anki';

export const createCardScratch: CreateCardKind[] = ['concept', 'flowchart', 'case', 'image'];
export const createCardFast: CreateCardKind[] = ['photo', 'ai', 'pdf', 'anki'];

/**
 * Disponibilidade de uma opção. A tela calcula a partir de `PlanDefinition` (D-023): este componente não conhece números.
 * - `available` (padrão): toca e chama `onSelect`.
 * - `pro` / `limit`: bloqueada por plano. Continua focável (`aria-disabled`); tocar chama `onBlocked` (folha de upgrade).
 * - `soon`: indisponível (`disabled`), com pill "Em breve".
 */
export type CreateCardAvailability = {
  status?: 'available' | 'pro' | 'limit' | 'soon';
  /** texto de apoio sob o título; sobrepõe `labels[kind].description` (ex.: "restam 5 no mês") */
  hint?: string;
};

export type CreateCardSheetProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  closeLabel: string;
  groups: { scratch: string; fast: string };
  labels: Record<CreateCardKind, { title: string; description?: string }>;
  /** textos das pills: `pro` ("Pro") e `soon` ("Em breve") */
  badges: { pro: string; soon: string };
  availability?: Partial<Record<CreateCardKind, CreateCardAvailability>>;
  onSelect: (kind: CreateCardKind) => void;
  onBlocked?: (kind: CreateCardKind, reason: 'pro' | 'limit') => void;
  /** por cima do scrim e do painel, parado (ver `BottomSheet.footer`): a barra do mapa com o "×" */
  footer?: ReactNode;
};

const icons: Record<Exclude<CreateCardKind, 'concept'>, IconName> = {
  flowchart: 'flow',
  case: 'audit',
  image: 'image',
  photo: 'camera',
  ai: 'sparkle',
  pdf: 'file',
  anki: 'upload',
};

function ConceptIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="3" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  );
}

export function CreateCardSheet({ open, onOpenChange, trigger, title, closeLabel, groups, labels, badges, availability, onSelect, onBlocked, footer }: CreateCardSheetProps) {
  const option = (kind: CreateCardKind, fast: boolean) => {
    const a = availability?.[kind] ?? {};
    const status = a.status ?? 'available';
    const blocked = status !== 'available';
    const sub = a.hint ?? labels[kind].description;
    const badge = status === 'pro' ? badges.pro : status === 'soon' ? badges.soon : undefined;
    return (
      <li key={kind}>
        <button
          type="button"
          disabled={status === 'soon'}
          aria-disabled={blocked || undefined}
          data-kind={kind}
          data-status={status}
          onClick={() => {
            if (status === 'available') onSelect(kind);
            else if (status === 'pro' || status === 'limit') onBlocked?.(kind, status);
          }}
          className={`flex w-full flex-col items-center gap-2 rounded-[18px] px-0.5 pb-1.5 pt-2.5 text-center text-[12.5px] font-semibold leading-tight text-on-dark ${fast ? 'min-h-[104px]' : 'min-h-[92px]'} ${blocked ? 'opacity-70' : ''} ${focusRing}`}
        >
          <span className={`relative flex size-[52px] items-center justify-center rounded-[17px] ${fast ? 'bg-steady-on-dark/20 text-on-dark' : 'bg-white/10 text-steady-on-dark'}`}>
            {kind === 'concept' ? <ConceptIcon /> : <Icon name={icons[kind]} size={26} />}
            {badge ? <span className="absolute -right-1.5 -top-1.5 rounded-pill bg-primary-deep px-2 py-0.5 text-[11.5px] font-extrabold leading-none text-on-dark">{badge}</span> : null}
          </span>
          <span>{labels[kind].title}</span>
          {sub ? <span className="text-[12px] font-normal text-on-dark-muted">{sub}</span> : null}
        </button>
      </li>
    );
  };
  const group = (id: string, label: string, kinds: CreateCardKind[], fast: boolean) => (
    <section aria-labelledby={id}>
      <h3 id={id} className={`px-1 pb-2 text-xs font-bold uppercase tracking-[.1em] text-on-dark-muted ${fast ? 'pt-3' : ''}`}>
        {label}
      </h3>
      <ul className="grid grid-cols-4 gap-1.5">{kinds.map((k) => option(k, fast))}</ul>
    </section>
  );
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} trigger={trigger} title={title} showTitle closeLabel={closeLabel} footer={footer}>
      {group('create-card-scratch', groups.scratch, createCardScratch, false)}
      {group('create-card-fast', groups.fast, createCardFast, true)}
    </BottomSheet>
  );
}
