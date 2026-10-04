'use client';

import { useId, useState, type ReactNode } from 'react';
import { focusRing, pressable } from '../button-styles';
import { Icon } from '../icons';
import { Switch } from '../switch';
import { StatusPill, type StatusTone } from './status-pill';

/** TypeChips (F19 FR-3): tipo do chamado em chips de 44 px (escolha única, `aria-pressed`). `legend` = "Sobre o que é?"; clicar no chip marcado desmarca (`onChange('')`). */
export type TypeChipsProps = { legend: string; groupLabel: string; options: ReadonlyArray<{ value: string; label: string }>; value: string; onChange: (value: string) => void };

export function TypeChips({ legend, groupLabel, options, value, onChange }: TypeChipsProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-bold">{legend}</span>
      <div role="group" aria-label={groupLabel} className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(on ? '' : o.value)} className={`h-11 rounded-pill border-[1.5px] px-4 text-sm font-bold transition-colors duration-200 ${on ? 'border-primary bg-primary-tint text-primary-deep' : 'border-border-strong bg-surface text-ink hover:border-primary'} ${pressable} ${focusRing}`}>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ContextDisclosure (F19 FR-4): "Informações técnicas enviadas junto". Botão que expande a lista exata do que segue (400 ms; chevron gira 300 ms)
 * e interruptor 56 × 32 (250 ms) para incluir ou não. `items` é a lista que o servidor grava (desligado: o app passa um item "Não serão enviadas"); `note` = "Nunca enviamos o conteúdo dos seus mapas nem a sua senha."
 * Expansão controlada (`open`/`onOpenChange`) ou não (`defaultOpen`). Fechado, o conteúdo fica `inert` (fora do foco e do leitor de tela).
 */
export type ContextDisclosureProps = {
  title: string;
  switchLabel: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  items: ReadonlyArray<{ k: string; v: string }>;
  note?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ContextDisclosure({ title, switchLabel, enabled, onEnabledChange, items, note, open, defaultOpen = false, onOpenChange }: ContextDisclosureProps) {
  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;
  const id = useId();
  const toggle = () => { setInner(!isOpen); onOpenChange?.(!isOpen); };
  return (
    <div className="flex flex-col gap-2.5 rounded-[18px] bg-canvas px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" aria-expanded={isOpen} aria-controls={id} onClick={toggle} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-btn bg-transparent text-left text-[14.5px] font-bold text-ink ${focusRing}`}>
          <span aria-hidden="true" className={`flex transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] ${isOpen ? 'rotate-180' : ''}`}><Icon name="chevronDown" size={18} /></span>
          {title}
        </button>
        <Switch size="lg" hideLabel label={switchLabel} checked={enabled} onCheckedChange={onEnabledChange} />
      </div>
      <div id={id} inert={!isOpen} className={`grid transition-[grid-template-rows] duration-[400ms] ease-[cubic-bezier(.22,1,.36,1)] ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="min-h-0 overflow-hidden">
          <dl className="m-0 flex flex-col gap-1.5 pb-1.5 pt-0.5">
            {items.map((c) => (
              <div key={c.k} className="flex justify-between gap-3 text-[13.5px]">
                <dt className="text-muted">{c.k}</dt>
                <dd className="m-0 text-right font-semibold">{c.v}</dd>
              </div>
            ))}
          </dl>
          {note ? <p className="m-0 text-[12.5px] leading-[1.45] text-muted">{note}</p> : null}
        </div>
      </div>
    </div>
  );
}

/** FileChip (F19 FR-3): anexo na lista do formulário (pílula de 40 px, entra com `pop`). `removeLabel` = aria-label completo ("Remover captura.png"). */
export type FileChipProps = { name: string; removeLabel: string; onRemove: () => void };

export function FileChip({ name, removeLabel, onRemove }: FileChipProps) {
  return (
    <span className="pop flex h-10 items-center gap-2 rounded-pill bg-primary-tint pl-3 pr-1.5 text-[13.5px] font-bold text-primary-deep">
      <Icon name="image" size={16} />
      <span className="max-w-[220px] truncate">{name}</span>
      <button type="button" aria-label={removeLabel} onClick={onRemove} className={`flex size-[30px] cursor-pointer items-center justify-center rounded-full bg-transparent text-primary-deep hover:bg-primary/15 ${focusRing}`}>
        <Icon name="close" size={14} />
      </button>
    </span>
  );
}

export type ThreadMessage = {
  id: string;
  /** "Você", "Equipe Remoa", nome do usuário */
  author: string;
  /** "agora", "há 18 min" */
  when: string;
  body: ReactNode;
  /** `self` = balão roxo à direita; `other` = balão claro à esquerda */
  side: 'self' | 'other';
  /** nota interna do admin: balão âmbar, com `internalLabel` no lugar do autor; nunca aparece para o usuário */
  internal?: boolean;
};

/**
 * Thread (F19 FR-7, FR-18): conversa de um chamado. Região `role="log"` com `aria-live="polite"` (respostas novas são anunciadas);
 * cada mensagem entra com `slide` (450 ms). `variant="admin"` usa balões de 76% com borda (caixa de entrada); `user` usa 84% (modal). Mensagens não se editam nem se apagam: não há ações aqui.
 */
export type ThreadProps = { 'aria-label': string; messages: ReadonlyArray<ThreadMessage>; internalLabel?: string; variant?: 'user' | 'admin' };

export function Thread({ messages, internalLabel, variant = 'user', ...rest }: ThreadProps) {
  const admin = variant === 'admin';
  return (
    <div role="log" aria-live="polite" aria-label={rest['aria-label']} className={`flex flex-col ${admin ? 'gap-3.5' : 'gap-3'}`}>
      {messages.map((m) => (
        <div key={m.id} data-internal={m.internal || undefined} className={`slide flex flex-col gap-1 ${m.side === 'self' ? 'items-end' : 'items-start'}`}>
          <span className="text-[12.5px] font-bold text-muted">{m.internal && internalLabel ? internalLabel : m.author} · {m.when}</span>
          <span className={`box-border whitespace-pre-wrap text-[15px] ${admin ? 'max-w-[76%] rounded-[20px] px-[18px] py-3.5 leading-[1.55]' : 'max-w-[84%] rounded-[18px] px-4 py-3 leading-normal'} ${m.internal ? 'border border-watch bg-watch-bg text-watch-text' : m.side === 'self' ? 'border border-transparent bg-primary text-on-primary' : admin ? 'border border-border bg-surface text-ink' : 'bg-chip text-ink'}`}>
            {m.body}
          </span>
        </div>
      ))}
    </div>
  );
}

export type TicketItem = {
  id: string;
  subject: string;
  /** "#1038 · Algo não funciona · 1 out" (já formatado) */
  meta: string;
  statusLabel: string;
  status: StatusTone;
  unread?: boolean;
  /** texto para leitor de tela do ponto laranja ("Resposta não lida") */
  unreadLabel?: string;
};

/**
 * TicketList (F19 FR-7): "Meus chamados". Lista de botões (assunto, número, tipo, data, status; ponto laranja se há resposta não lida).
 * Cartão com não lida: borda e fundo da marca. `emptyText` aparece quando não há chamados.
 */
export type TicketListProps = { 'aria-label': string; items: ReadonlyArray<TicketItem>; onSelect: (id: string) => void; emptyText: string };

export function TicketList({ items, onSelect, emptyText, ...rest }: TicketListProps) {
  if (items.length === 0) return <p className="m-0 px-7 py-8 text-center text-muted">{emptyText}</p>;
  return (
    <ul aria-label={rest['aria-label']} className="m-0 flex list-none flex-col gap-2 p-0">
      {items.map((t) => (
        <li key={t.id}>
          <button type="button" onClick={() => onSelect(t.id)} className={`box-border flex w-full cursor-pointer items-center gap-3.5 rounded-[18px] border-[1.5px] px-4 py-3.5 text-left transition-colors duration-200 ${t.unread ? 'border-primary bg-primary-tint' : 'border-border bg-surface hover:border-primary'} ${focusRing}`}>
            <span aria-hidden="true" className={`flex size-11 shrink-0 items-center justify-center rounded-[14px] text-primary-deep ${t.unread ? 'bg-surface' : 'bg-chip'}`}><Icon name="chat" size={22} /></span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span className="truncate text-[15.5px] font-bold">{t.subject}</span>
                {t.unread ? <span role="img" aria-label={t.unreadLabel} className="size-[9px] shrink-0 rounded-full bg-review" /> : null}
              </span>
              <span className="text-[13px] text-muted">{t.meta}</span>
            </span>
            <StatusPill tone={t.status} size="sm">{t.statusLabel}</StatusPill>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * SupportSuccess (F19 FR-6): envio concluído. Anel (900 ms) e check (500 ms, atraso 750 ms) desenhados; `role="status"` anuncia "Chamado #1042 enviado." (`title`).
 * Dois botões: `primary` ("Ver meus chamados") e `secondary` ("Fechar"); as ações vêm prontas (`ReactNode`, use Button).
 */
export type SupportSuccessProps = { title: string; text: string; actions: ReactNode };

export function SupportSuccess({ title, text, actions }: SupportSuccessProps) {
  return (
    <div role="status" className="pop flex flex-col items-center gap-3.5 px-7 pb-[30px] pt-[34px] text-center">
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
        <circle cx="48" cy="48" r="34" className="fill-primary-tint" />
        <circle className="draw stroke-primary" cx="48" cy="48" r="42" strokeWidth="6" strokeLinecap="round" transform="rotate(-90 48 48)" />
        <path className="drawc stroke-primary-deep" d="M34 49l10 10 19-23" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h3 className="m-0 font-display text-[30px] font-extrabold tracking-[-0.03em]">{title}</h3>
      <p className="m-0 max-w-[420px] text-base leading-[1.55] text-muted">{text}</p>
      <div className="mt-2 flex gap-2.5">{actions}</div>
    </div>
  );
}
