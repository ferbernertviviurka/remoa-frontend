import type { ComponentType, ReactNode } from 'react';
import { focusRing } from '../button';

/**
 * SettingsNav: subnav lateral (248 px a partir de md; largura total no mobile). Itens são links (`href`), o atual leva
 * `aria-current="page"`. `linkComponent` troca o <a> (passe `next/link`). `chip` por item = pílula (ex.: "Free" no plano).
 * `footer` = slot depois do separador (ex.: `SettingsNavAction` "Sair da conta").
 */
export type SettingsNavLinkProps = { href: string; className?: string; 'aria-current'?: 'page'; children: ReactNode };
export type SettingsNavItem = { id: string; href: string; label: string; icon?: ReactNode; chip?: string; chipTone?: 'neutral' | 'primary'; current?: boolean };
export type SettingsNavProps = { label: string; items: ReadonlyArray<SettingsNavItem>; linkComponent?: ComponentType<SettingsNavLinkProps>; footer?: ReactNode };

const DefaultLink = ({ children, ...p }: SettingsNavLinkProps) => <a {...p}>{children}</a>;
const row = `flex h-[52px] w-full items-center gap-3 rounded-[16px] px-3.5 text-left text-[15px] transition-colors duration-200 ${focusRing}`;

export function SettingsNav({ label, items, linkComponent: Link = DefaultLink, footer }: SettingsNavProps) {
  return (
    <nav aria-label={label} className="box-border flex w-full flex-col gap-1 rounded-list border border-border bg-surface p-2.5 md:w-[248px]">
      {items.map((it) => (
        <Link
          key={it.id}
          href={it.href}
          aria-current={it.current ? 'page' : undefined}
          className={`${row} ${it.current ? 'bg-primary-tint font-bold text-primary-deep' : 'font-semibold text-ink hover:bg-chip'}`}
        >
          {it.icon}
          <span className="grow">{it.label}</span>
          {it.chip ? <span className={`rounded-pill px-2.5 py-0.5 text-xs font-bold ${it.chipTone === 'primary' ? 'bg-primary text-on-primary' : 'bg-chip text-muted'}`}>{it.chip}</span> : null}
        </Link>
      ))}
      {footer ? (
        <>
          <span aria-hidden="true" className="mx-2.5 my-1.5 h-px bg-border" />
          {footer}
        </>
      ) : null}
    </nav>
  );
}

/** Ação de rodapé com o visual de um item (botão real). */
export function SettingsNavAction({ icon, children, onClick }: { icon?: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${row} font-semibold text-ink hover:bg-chip`}>
      {icon}
      {children}
    </button>
  );
}
