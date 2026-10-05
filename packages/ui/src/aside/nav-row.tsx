import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { focusRing } from '../button-styles';
import { Icon, type IconName } from '../icons';

/**
 * Linha do aside do mapa: ícone, rótulo, subtítulo opcional, chevron. `href` = link; `soon` = pill "Em breve" (texto por prop) e a linha fica desativada.
 */
export type NavRowProps = {
  icon: IconName;
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  /** texto da pill (ex.: "Em breve"); desativa a linha */
  soon?: string;
  /** conteúdo extra à direita, no lugar do chevron */
  trailing?: ReactNode;
};

export const rowBase = `flex min-h-[58px] w-full items-center gap-3.5 border-b border-divider bg-transparent py-1.5 text-left text-ink ${focusRing}`;

export function RowBody({ icon, label, description, end }: { icon: IconName; label: string; description?: string; end: ReactNode }) {
  return (
    <>
      <span className="flex w-7 shrink-0 justify-center"><Icon name={icon} size={22} /></span>
      <span className="flex min-w-0 grow flex-col leading-[1.3]">
        <span className="text-[15.5px] font-semibold">{label}</span>
        {description ? <span className="text-[12.5px] text-muted">{description}</span> : null}
      </span>
      {end}
    </>
  );
}

export function NavRow({ icon, label, description, href, onClick, soon, trailing }: NavRowProps) {
  const end = soon ? (
    <span className="shrink-0 rounded-pill bg-panel-dark px-2.5 py-[3px] text-[11.5px] font-extrabold text-on-dark">{soon}</span>
  ) : (
    trailing ?? <Icon name="chevronRight" size={20} className="shrink-0 text-muted" />
  );
  const body = <RowBody icon={icon} label={label} description={description} end={end} />;
  if (soon) return <button type="button" aria-disabled="true" disabled className={clsx(rowBase, 'cursor-not-allowed opacity-60')}>{body}</button>;
  if (href) return <a href={href} onClick={onClick} className={clsx(rowBase, 'cursor-pointer no-underline')}>{body}</a>;
  return <button type="button" onClick={onClick} className={clsx(rowBase, 'cursor-pointer')}>{body}</button>;
}
