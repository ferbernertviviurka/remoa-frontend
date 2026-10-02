import { useId, type ReactNode } from 'react';

/**
 * DangerCard: "zona de perigo" (fundo creme, borda salmão, texto #7C2D12 do mock da Conta). `title` é um h2;
 * `description` explica a consequência; `children` = a ação (Button destrutivo), abaixo do texto.
 */
export type DangerCardProps = { title: string; description: string; children?: ReactNode };

export function DangerCard({ title, description, children }: DangerCardProps) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 rounded-[28px] border-[1.5px] border-[#F2B79A] bg-[#FFF7F0] px-5 py-6 text-[#7C2D12] md:px-7">
      <h2 id={id} className="m-0 font-display text-[23px] font-extrabold leading-tight tracking-[-0.025em]">{title}</h2>
      <p className="m-0 mb-2 max-w-[560px] text-[15px] leading-normal">{description}</p>
      {children ? <div className="flex">{children}</div> : null}
    </section>
  );
}
