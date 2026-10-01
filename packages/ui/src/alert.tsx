import type { ReactNode } from 'react';
import { toneClasses, type Tone } from './tone';

/** Aviso em bloco. tone = brand | review | watch | steady | unknown. */
export type AlertProps = { tone?: Tone; title: string; children?: ReactNode; role?: 'status' | 'alert' };

export function Alert({ tone = 'brand', title, children, role = 'status' }: AlertProps) {
  return (
    <div role={role} className={`rounded-map border border-current/15 px-4 py-3 ${toneClasses[tone]}`}>
      <p className="font-display text-sm font-bold">{title}</p>
      {children ? <div className="mt-2 flex flex-col items-start gap-2 text-sm">{children}</div> : null}
    </div>
  );
}
