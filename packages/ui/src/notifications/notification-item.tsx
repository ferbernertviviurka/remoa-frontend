'use client';

import { Icon, type IconName } from '../icons';
import { focusRing } from '../button-styles';
import type { NotificationKind, NotificationView } from './types';

/** Ícone e cores por tipo (do mock: NTK). Cores via tokens. */
export const KIND_STYLE: Record<NotificationKind, { icon: IconName; box: string }> = {
  calendar: { icon: 'calendar', box: 'bg-review-bg text-review-text' },
  review: { icon: 'bolt', box: 'bg-primary-tint text-primary-deep' },
  map: { icon: 'maps', box: 'bg-notif-map text-primary-deep' },
  referral: { icon: 'gift', box: 'bg-watch-bg text-watch-text' },
  support: { icon: 'lifebuoy', box: 'bg-notif-support text-notif-support-text' },
  purchase: { icon: 'creditCard', box: 'bg-primary-tint text-primary-deep' },
  store: { icon: 'store', box: 'bg-unknown-bg text-muted' },
  account: { icon: 'user', box: 'bg-primary-tint text-primary-deep' },
};

/**
 * NotificationItem (F26 FR-3). Duas variantes:
 * - `popover` (padrão): o item inteiro é um link (`href`); o ponto de não lida é um botão irmão "Marcar como lida" (44 px) — nunca botão dentro de link.
 * - `page`: linha da página `/notificacoes`, com ações Abrir (link), Marcar como lida (só se não lida) e Remover.
 * Título em negrito se não lida; fundo `--soft` se não lida; troca de fundo em 300 ms. `index` define o atraso da entrada (`slide`: 35 ms no popover, 40 ms na página).
 * Textos vêm por props (o app passa `t('notifications.item.*')`). Clicar no link chama `onOpen` (o app marca como lida e navega).
 */
export type NotificationItemProps = {
  item: NotificationView;
  variant?: 'popover' | 'page';
  index?: number;
  /** "há 2 h · Categoria" já montado */
  meta: string;
  markReadLabel: string;
  onOpen?: (id: string) => void;
  onMarkRead?: (id: string) => void;
  /** só variante `page` */
  openLabel?: string;
  removeLabel?: string;
  onRemove?: (id: string) => void;
};

export function NotificationItem({ item, variant = 'popover', index = 0, meta, markReadLabel, onOpen, onMarkRead, openLabel, removeLabel, onRemove }: NotificationItemProps) {
  const k = KIND_STYLE[item.kind];
  const page = variant === 'page';
  const bg = item.unread ? 'bg-soft' : 'bg-surface';
  const weight = item.unread ? 'font-extrabold' : 'font-semibold';
  const icon = (
    <span className={`flex shrink-0 items-center justify-center ${page ? 'size-12 rounded-[16px]' : 'size-10 rounded-[14px]'} ${k.box}`}>
      <Icon name={k.icon} size={page ? 24 : 20} />
    </span>
  );

  if (page) {
    return (
      <div data-unread={item.unread} className={`slide flex items-center gap-4 border-t border-divider py-4 pl-6 pr-4 transition-colors duration-300 ${bg}`} style={{ animationDelay: `${index * 40}ms` }}>
        {icon}
        <span className="flex min-w-0 grow flex-col gap-[3px] leading-[1.4]">
          <span className="flex items-center gap-2">
            <span className={`text-base ${weight}`}>{item.title}</span>
            {item.unread ? <span aria-hidden="true" className="size-[9px] shrink-0 rounded-full bg-primary" /> : null}
          </span>
          <span className="text-ink-2">{item.body}</span>
          <span className="text-[12.5px] text-muted">{meta}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <a href={item.href} onClick={() => onOpen?.(item.id)} className={`lift flex h-11 items-center justify-center rounded-[13px] border-[1.5px] border-border-strong bg-surface px-4 text-sm font-bold text-ink no-underline ${focusRing}`}>{openLabel}</a>
          {item.unread ? (
            <button type="button" aria-label={markReadLabel} onClick={() => onMarkRead?.(item.id)} className={`flex size-11 items-center justify-center rounded-[13px] border-0 bg-transparent text-primary-deep ${focusRing}`}><Icon name="check" size={20} /></button>
          ) : null}
          <button type="button" aria-label={removeLabel} onClick={() => onRemove?.(item.id)} className={`flex size-11 items-center justify-center rounded-[13px] border-0 bg-transparent text-muted ${focusRing}`}><Icon name="trash" size={18} /></button>
        </span>
      </div>
    );
  }

  return (
    <div data-unread={item.unread} className={`slide flex items-start border-t border-divider transition-colors duration-300 ${bg}`} style={{ animationDelay: `${index * 35}ms` }}>
      <a href={item.href} onClick={() => onOpen?.(item.id)} className={`flex min-w-0 grow items-start gap-3 py-3 pl-5 pr-3 text-ink no-underline ${focusRing}`}>
        {icon}
        <span className="flex min-w-0 grow flex-col gap-0.5 leading-[1.35]">
          <span className={`text-[14.5px] ${weight}`}>{item.title}</span>
          <span className="truncate text-[13px] text-muted">{item.body}</span>
          <span className="text-xs text-muted">{meta}</span>
        </span>
      </a>
      {item.unread ? (
        <button type="button" aria-label={markReadLabel} onClick={() => onMarkRead?.(item.id)} className={`my-[10px] mr-3 flex size-11 shrink-0 items-center justify-center rounded-xl border-0 bg-transparent ${focusRing}`}>
          <span aria-hidden="true" className="size-2.5 rounded-full bg-primary" />
        </button>
      ) : null}
    </div>
  );
}

/** Cabeçalho de grupo (Hoje, Ontem, Esta semana, Antes) e lista de itens. */
export type NotificationGroupsProps = Pick<NotificationItemProps, 'variant' | 'markReadLabel' | 'onOpen' | 'onMarkRead' | 'openLabel' | 'removeLabel' | 'onRemove'> & {
  groups: ReadonlyArray<{ id: string; label: string; items: ReadonlyArray<NotificationView> }>;
  /** monta "há 2 h · Categoria" (o app usa t('notifications.item.meta', ...)) */
  formatMeta: (item: NotificationView) => string;
};

export function NotificationGroups({ groups, formatMeta, variant = 'popover', ...rest }: NotificationGroupsProps) {
  let n = 0;
  return (
    <>
      {groups.filter((g) => g.items.length > 0).map((g) => (
        <div key={g.id} role="group" aria-label={g.label}>
          <div aria-hidden="true" className={`text-xs font-bold uppercase tracking-[.1em] text-muted ${variant === 'page' ? 'bg-soft px-6 pb-1.5 pt-4' : 'px-5 pb-1 pt-3'}`}>{g.label}</div>
          {g.items.map((item) => <NotificationItem key={item.id} item={item} variant={variant} index={n++} meta={formatMeta(item)} {...rest} />)}
        </div>
      ))}
    </>
  );
}

/** Estado vazio / tudo lido: círculo com check e texto. `size="page"` = 64 px, senão 56 px. */
export function NotificationEmpty({ text, size = 'popover' }: { text: string; size?: 'popover' | 'page' }) {
  const page = size === 'page';
  return (
    <div className={`flex flex-col items-center gap-2.5 text-center text-muted ${page ? 'px-6 py-14' : 'px-6 py-11'}`}>
      <span className={`flex items-center justify-center rounded-full bg-primary-tint text-primary-deep ${page ? 'size-16' : 'size-14'}`}><Icon name="check" size={page ? 32 : 28} /></span>
      <span>{text}</span>
    </div>
  );
}
