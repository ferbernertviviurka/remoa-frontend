import type { ComponentProps } from 'react';
import { focusRing } from '../button';
import { Icon } from '../icons';

/**
 * SupportFab (F19 FR-1): pílula escura de 60 px, canto inferior direito a 28 px (`fixed`, z-40: acima do conteúdo, abaixo de Dialog z-50).
 * `label` = texto visível ("Suporte"); `aria-label` obrigatório (já inclui as não lidas, ex.: "Abrir suporte, 1 resposta"); sempre `aria-haspopup="dialog"`.
 * `unread` > 0 mostra o selo laranja que pulsa (2,4 s; desligado com movimento reduzido). Eleva 3 px ao passar o mouse (200 ms).
 * Escondido abaixo de `lg`: no celular o acesso é o item "Ajuda" da navegação inferior (F09). Alvo 60 px (≥ 44).
 */
export type SupportFabProps = Omit<ComponentProps<'button'>, 'className' | 'children' | 'aria-haspopup' | 'aria-label'> & { label: string; 'aria-label': string; unread?: number };

export function SupportFab({ label, unread = 0, type = 'button', ...rest }: SupportFabProps) {
  return (
    <button
      type={type}
      aria-haspopup="dialog"
      {...rest}
      className={`lift fixed bottom-7 right-7 z-40 flex h-[60px] cursor-pointer items-center gap-2.5 rounded-pill bg-panel-dark pl-[18px] pr-6 text-base font-extrabold text-on-dark shadow-[0_18px_44px_rgba(36,26,92,.4)] max-md:hidden ${focusRing}`}
    >
      <Icon name="help" size={26} />
      {label}
      {unread > 0 ? (
        <span aria-hidden="true" data-testid="support-fab-badge" className="pulse absolute -right-0.5 -top-1 flex h-6 min-w-6 items-center justify-center rounded-pill border-2 border-canvas bg-review px-[7px] text-xs font-extrabold text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </button>
  );
}
