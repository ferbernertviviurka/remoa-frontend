'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Icon } from '../icons';
import { focusRing } from '../button-styles';

/**
 * BellButton (F26 FR-1): botão de 44 px com sino e selo laranja de não lidas ("9+" acima de 9; some em 0).
 * `label` (aria-label, obrigatório; o app passa t('notifications.bell.*')). `aria-expanded`/`aria-haspopup` chegam do gatilho do popover.
 * O sino sacode (1,4 s, 2×, atraso 0,8 s) ao montar com não lidas e sempre que a contagem sobe; o selo entra com mola de 500 ms.
 * Movimento reduzido desliga os dois (motion.css).
 */
export type BellButtonProps = Omit<ComponentProps<'button'>, 'className' | 'children' | 'aria-label'> & { count: number; label: string };

export function BellButton({ count, label, type = 'button', ...rest }: BellButtonProps) {
  const prev = useRef(count);
  const [shake, setShake] = useState(0);
  useEffect(() => {
    if (count > prev.current) setShake((n) => n + 1);
    prev.current = count;
  }, [count]);
  return (
    <button type={type} aria-label={label} {...rest} className={`lift relative flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-border bg-surface text-ink ${focusRing}`}>
      <span key={shake} data-testid="bell-icon" className={`flex ${count > 0 ? 'nt-shake' : ''}`}><Icon name="bell" size={22} /></span>
      {count > 0 ? (
        <span aria-hidden="true" className="nt-badge absolute -right-1.5 -top-[7px] box-border flex h-[21px] min-w-[21px] items-center justify-center rounded-pill border-2 border-surface bg-review px-[5px] text-[11.5px] font-extrabold text-on-primary">
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </button>
  );
}
