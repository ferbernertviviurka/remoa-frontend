import type { ReactNode } from 'react';
import { focusRing } from '../button';
import { ProgressTimeline, type ProgressTimelineProps } from './progress-tracker';
import { statusStyle, type ReferralStatus } from './status';

export interface FriendRowProps {
  name: string;
  /** Data já formatada ("Cadastrou em 1 out") */
  when: string;
  /** Etiqueta do estado ("Cadastrou") */
  statusLabel: string;
  status: ReferralStatus;
  selected?: boolean;
  /** Mesma ação do clique no nó do mapa (estado compartilhado pelo app) */
  onSelect?: () => void;
}

/** FriendRow (F18 FR-11): um amigo na lista (iniciais, nome, data, estado). Botão com `aria-pressed`; vai dentro de `FriendList`. */
export function FriendRow({ name, when, statusLabel, status, selected, onSelect }: FriendRowProps) {
  const st = statusStyle[status];
  return (
    <li>
      <button type="button" aria-pressed={selected} onClick={onSelect} className={['flex min-h-14 w-full items-center gap-3 rounded-[16px] border-[1.5px] py-1.5 pl-2 pr-3 text-left transition-[background-color,border-color] duration-[250ms]', selected ? 'border-primary bg-primary-tint' : 'border-border bg-surface', focusRing].join(' ')}>
        <span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-full font-display text-base font-extrabold ${st.avatar}`}>{name.charAt(0).toUpperCase()}</span>
        <span className="flex min-w-0 flex-1 flex-col leading-snug">
          <span className="truncate text-[14.5px] font-bold">{name}</span>
          <span className="text-[12.5px] text-muted">{when}</span>
        </span>
        <span className={`whitespace-nowrap rounded-pill px-2.5 py-[3px] text-xs font-bold ${st.chip}`}>{statusLabel}</span>
      </button>
    </li>
  );
}

/** FriendList: a lista é a representação principal para leitor de tela (o mapa é `aria-hidden`). Vazia: mostra `emptyText`. */
export function FriendList({ children, emptyText, ...rest }: { 'aria-label': string; children?: ReactNode; emptyText: string }) {
  const empty = !children || (Array.isArray(children) && children.length === 0);
  return empty ? (
    <p className="m-0 px-1.5 py-[18px] text-[15px] leading-normal text-muted">{emptyText}</p>
  ) : (
    <ul aria-label={rest['aria-label']} className="m-0 flex max-h-[230px] list-none flex-col gap-1.5 overflow-auto p-0">{children}</ul>
  );
}

export interface FriendDetailProps extends Pick<ProgressTimelineProps, 'steps' | 'status' | 'doneLabel'> {
  name: string;
  statusLabel: string;
  /** O que falta para o mês ("O mês é liberado para os dois quando essa pessoa criar o primeiro mapa.") */
  text: string;
  /** Ação opcional do protótipo/ajuda */
  children?: ReactNode;
}

/** FriendDetail (F18 FR-11): detalhe do amigo selecionado com linha do tempo de 3 passos; entra com `pop` (400 ms). */
export function FriendDetail({ name, statusLabel, status, steps, doneLabel, text, children }: FriendDetailProps) {
  return (
    <section aria-label={name} className="pop flex flex-col gap-3 rounded-[24px] bg-canvas p-[18px]">
      <span className="flex items-center justify-between gap-2.5">
        <h3 className="m-0 font-display text-[22px] font-extrabold tracking-[-0.02em]">{name}</h3>
        <span className={`rounded-pill px-2.5 py-[3px] text-xs font-bold ${statusStyle[status].chip}`}>{statusLabel}</span>
      </span>
      <ProgressTimeline steps={steps} status={status} doneLabel={doneLabel} />
      <p className="m-0 text-[13.5px] leading-normal text-ink-2">{text}</p>
      {children}
    </section>
  );
}
