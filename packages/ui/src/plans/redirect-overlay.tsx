import { createPortal } from 'react-dom';
import { Icon } from '../icons';

/**
 * RedirectOverlay: "Abrindo o pagamento seguro". Cobre o contêiner posicionado (`fixed inset-0`), anel girando + barra de 1,8 s.
 * `role="status"`; `title` e `description` por props. Movimento reduzido: anel e barra ficam parados (estado final).
 */
export type RedirectOverlayProps = { title: string; description: string };

export function RedirectOverlay({ title, description }: RedirectOverlayProps) {
  // Portal: the order summary is `sticky` (a stacking context), which would keep the overlay under the z-20 navbar.
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(26,21,51,0.6)] p-4">
      <div role="status" className="pop flex w-[460px] max-w-full flex-col items-center gap-3.5 rounded-hero bg-surface px-8 py-[34px] text-center shadow-lift">
        <span className="relative block size-[76px]">
          <svg className="animate-spin" width="76" height="76" viewBox="0 0 76 76" fill="none" aria-hidden="true">
            <circle cx="38" cy="38" r="33" stroke="var(--track)" strokeWidth="5" />
            <path d="M38 5a33 33 0 0133 33" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-primary-deep"><Icon name="lock" size={28} /></span>
        </span>
        <h2 className="m-0 font-display text-[26px] font-extrabold tracking-[-0.03em]">{title}</h2>
        <p className="m-0 text-[15px] leading-normal text-muted">{description}</p>
        <span aria-hidden="true" className="block h-2 w-full overflow-hidden rounded bg-track">
          <span data-testid="redirect-bar" className="fillx-linear block h-2 w-full rounded bg-primary" />
        </span>
      </div>
    </div>,
    document.body,
  );
}
