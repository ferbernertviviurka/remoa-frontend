import { clsx } from 'clsx';
import type { IconName } from '../icons';
import { RowBody, rowBase } from './nav-row';

/** Camada do mapa: linha inteira é um `role="switch"` (alvo ≥ 58 px); trilho 52 × 30, bolinha 24, deslize de 250 ms. */
export type ToggleRowProps = {
  icon: IconName;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function ToggleRow({ icon, label, description, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)} className={clsx(rowBase, 'cursor-pointer')}>
      <RowBody
        icon={icon}
        label={label}
        description={description}
        end={
          <span aria-hidden="true" className={clsx('relative block h-[30px] w-[52px] shrink-0 rounded-pill transition-colors duration-200', checked ? 'bg-primary' : 'bg-unknown-soft')}>
            <span className={clsx('switch-thumb absolute left-[3px] top-[3px] size-6 rounded-full bg-white shadow-[0_2px_6px_rgba(26,21,51,.3)]', checked && 'translate-x-[22px]')} />
          </span>
        }
      />
    </button>
  );
}
