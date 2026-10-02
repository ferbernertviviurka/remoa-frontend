import { useId, type ReactNode } from 'react';

/** Card of the "Conta" mock: 26 px radius, 28 px padding, Bricolage 23 px title, muted subtitle, optional action at the top right. */
export function SectionCard({ title, body, action, children }: { title: string; body?: string; action?: ReactNode; children?: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-1.5 rounded-list border border-border bg-surface px-5 py-6 md:px-7">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 id={id} className="m-0 font-display text-[23px] font-extrabold leading-tight tracking-[-0.025em]">
            {title}
          </h2>
          {body ? <p className={`m-0 text-[15px] text-muted ${children ? 'mb-2.5' : ''}`}>{body}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Label (190 px) + value row, top divider. */
export const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid min-h-[76px] items-center gap-x-4 gap-y-2 border-t border-divider py-3 sm:grid-cols-[190px_minmax(0,1fr)] sm:py-0">
    <span className="font-semibold text-muted">{label}</span>
    {children}
  </div>
);

/** Setting row: bold title + muted description on the left, control on the right (Preferências, mock rows of ~83 px). */
export const SettingRow = ({ title, body, children }: { title: string; body?: string; children: ReactNode }) => (
  <div className="flex min-h-[82px] items-center justify-between gap-4 border-t border-divider py-3">
    <div className="flex min-w-0 flex-col">
      <span className="font-bold text-ink">{title}</span>
      {body ? <span className="text-[15px] text-muted">{body}</span> : null}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);
