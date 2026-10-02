import type { ReactNode } from 'react';

/**
 * SuccessPanel: confirmação do Pro. Anel que se desenha (900 ms) e check (500 ms), `title`, `description`, benefícios em cascata
 * (70 ms entre itens) e slot `actions`. É um cartão (`section`); quem usa decide se vai num overlay/dialog ou na página.
 */
export type SuccessPanelProps = { title: string; description: string; benefits: ReadonlyArray<string>; actions?: ReactNode;
  /** dentro de um Dialog cujo título já diz o mesmo (leitor de tela não repete) */
  inDialog?: boolean;
};

export function SuccessPanel({ title, description, benefits, actions, inDialog }: SuccessPanelProps) {
  return (
    <section aria-labelledby={inDialog ? undefined : 'success-title'} className="pop flex w-[540px] max-w-full flex-col items-center gap-3.5 rounded-[32px] bg-surface px-[34px] pb-[30px] pt-9 text-center shadow-lift">
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
        <circle cx="48" cy="48" r="34" fill="var(--primary-tint)" />
        <circle data-testid="success-ring" className="draw" cx="48" cy="48" r="42" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" transform="rotate(-90 48 48)" />
        <path className="drawc" d="M34 49l10 10 19-23" stroke="var(--primary-deep)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h2 id="success-title" aria-hidden={inDialog || undefined} className="m-0 font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.035em]">{title}</h2>
      <p aria-hidden={inDialog || undefined} className="m-0 text-[15px] leading-normal text-muted">{description}</p>
      <ul className="m-0 mt-1.5 flex w-full list-none flex-col gap-1 p-0 text-left">
        {benefits.map((b, i) => (
          <li key={b} className="slide flex items-center gap-3 rounded-[14px] bg-chip px-3.5 py-2.5 font-semibold" style={{ animationDelay: `${i * 70}ms` }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-primary-deep"><path d="M5 12l5 5L20 6" /></svg>
            {b}
          </li>
        ))}
      </ul>
      {actions ? <div className="mt-2.5 flex flex-wrap justify-center gap-2.5">{actions}</div> : null}
    </section>
  );
}
