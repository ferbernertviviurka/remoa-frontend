'use client';

import { Children, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import * as RD from '@radix-ui/react-dialog';
import { focusRing } from '../button-styles';
import { Icon } from '../icons';

/**
 * Aside do mapa no celular (F23 FR-15/16, MapaMobileMenu.dc.html): abre pela esquerda (344 px, máx. 88%), scrim a 55%,
 * itens em cascata (100 ms + 40 ms por item; `--i`), foco preso e devolvido ao hambúrguer, Esc, arrastar para a esquerda fecha.
 * Movimento reduzido (sistema ou `data-motion="reduced"`) zera as animações em motion.css: aparece direto.
 * Ordem: cabeçalho (voltar + fechar), prévia, nome com favorito, dono, `progress`, `children` (ações e camadas), detalhes.
 */
export type MapAsideProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** nome acessível do diálogo (ex.: "Menu do mapa") */
  label: string;
  closeLabel: string;
  backLabel: string;
  backHref?: string;
  onBack?: () => void;
  /** nome do mapa */
  title: string;
  /** ex.: "Clínica Médica · só você vê" */
  subtitle?: string;
  /** inicial do dono no avatar */
  ownerInitial?: string;
  favorite?: { label: string; pressed: boolean; onToggle: (pressed: boolean) => void };
  /** prévia do mapa (botão que ajusta à tela) */
  preview?: { node: ReactNode; label: string; caption?: string; onClick: () => void };
  progress?: ReactNode;
  /** linhas de ação/camadas (NavRow, ToggleRow) */
  children?: ReactNode;
  detailsTitle?: string;
  details?: { label: string; value: string }[];
};

const DRAG_CLOSE = 80;

export function MapAside({ open, onOpenChange, label, closeLabel, backLabel, backHref, onBack, title, subtitle, ownerInitial, favorite, preview, progress, children, detailsTitle, details }: MapAsideProps) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [dx, setDx] = useState(0);
  const onDown = (e: PointerEvent) => { start.current = { x: e.clientX, y: e.clientY }; };
  const onMove = (e: PointerEvent) => {
    if (!start.current) return;
    const mx = e.clientX - start.current.x;
    const my = e.clientY - start.current.y;
    setDx(mx < 0 && Math.abs(mx) > Math.abs(my) ? mx : 0);
  };
  const onUp = () => {
    if (start.current && dx < -DRAG_CLOSE) onOpenChange(false);
    start.current = null;
    setDx(0);
  };
  const items = Children.toArray(children);
  const back = 'flex h-11 items-center gap-2 rounded-[14px] px-2.5 -ml-2 font-bold text-ink no-underline';
  const sec = 'pt-5 pb-1.5 text-xs font-bold uppercase tracking-[.12em] text-muted';
  // filhos diretos do corpo recebem --i (cascata)
  let i = 0;
  const cascade = (node: ReactNode, key: string) => <div key={key} style={{ '--i': i++ } as CSSProperties}>{node}</div>;
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="remoa-aside-scrim fixed inset-0 z-[80] bg-[rgba(26,21,51,.55)]" />
        <RD.Content
          aria-describedby={undefined}
          onOpenAutoFocus={() => { opener.current = document.activeElement as HTMLElement | null; }}
          onCloseAutoFocus={(e) => { e.preventDefault(); opener.current?.focus(); }} // aberto por estado (sem trigger): devolve ao hambúrguer
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={dx ? { transform: `translateX(${dx}px)`, animation: 'none' } : undefined}
          className="remoa-aside fixed inset-y-0 left-0 z-[81] w-[344px] max-w-[88%] overflow-y-auto rounded-r-[30px] bg-surface text-ink shadow-[24px_0_60px_rgba(26,21,51,.3)] outline-none"
        >
          <RD.Title className="sr-only">{label}</RD.Title>
          <div className="remoa-aside-body flex flex-col px-5 pb-10 pt-[50px]">
            {cascade(
              <div className="flex h-[52px] items-center justify-between">
                {backHref ? <a href={backHref} onClick={onBack} className={`${back} ${focusRing}`}><Icon name="left" />{backLabel}</a> : <button type="button" onClick={onBack} className={`${back} cursor-pointer border-0 bg-transparent ${focusRing}`}><Icon name="left" />{backLabel}</button>}
                <RD.Close aria-label={closeLabel} className={`-mr-2 flex size-11 cursor-pointer items-center justify-center rounded-[14px] border-0 bg-chip text-ink ${focusRing}`}><Icon name="close" size={20} /></RD.Close>
              </div>, 'head')}
            {preview ? cascade(
              <div className="flex items-end gap-3.5 pb-1 pt-2">
                <button type="button" aria-label={preview.label} onClick={preview.onClick} className={`relative h-[92px] w-[132px] shrink-0 cursor-pointer overflow-hidden rounded-[18px] border border-border bg-canvas p-0 ${focusRing}`}>{preview.node}</button>
                {preview.caption ? <span aria-hidden="true" className="text-[12.5px] font-bold text-primary-deep">{preview.caption}</span> : null}
              </div>, 'preview') : null}
            {cascade(
              <div className="flex items-center gap-2.5 pb-0.5 pt-3">
                {favorite ? (
                  <button type="button" role="switch" aria-checked={favorite.pressed} aria-label={favorite.label} onClick={() => favorite.onToggle(!favorite.pressed)} className={`-ml-2 flex size-11 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent transition-colors duration-200 ${favorite.pressed ? 'text-watch' : 'text-muted'} ${focusRing}`}>
                    <span className={`flex transition-transform duration-[350ms] ease-[cubic-bezier(.34,1.56,.64,1)] ${favorite.pressed ? 'scale-[1.2]' : 'scale-100'}`}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill={favorite.pressed ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z" /></svg>
                    </span>
                  </button>
                ) : null}
                <h2 className="m-0 font-display text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em]">{title}</h2>
              </div>, 'title')}
            {subtitle ? cascade(
              <div className="flex items-center gap-2.5 pb-3.5 pt-0.5">
                {ownerInitial ? (
                  <span aria-hidden="true" className="relative flex size-[34px] items-center justify-center rounded-full bg-panel-dark text-sm font-extrabold text-on-dark">
                    {ownerInitial}
                    <span className="absolute -bottom-px -right-px size-2.5 rounded-full border-2 border-surface bg-[#22c55e]" />
                  </span>
                ) : null}
                <span className="text-sm text-muted">{subtitle}</span>
              </div>, 'subtitle') : null}
            {progress ? cascade(progress, 'progress') : null}
            {items.map((c, n) => cascade(c, `row-${n}`))}
            {details?.length ? cascade(<h3 className={`m-0 ${sec}`}>{detailsTitle}</h3>, 'details-title') : null}
            {details?.length ? cascade(
              <dl className="m-0 flex flex-col gap-3 pb-1.5">
                {details.map((d) => (
                  <div key={d.label} className="flex flex-col leading-[1.3]">
                    <dt className="text-[12.5px] text-muted">{d.label}</dt>
                    <dd className="m-0 text-[15px] font-semibold">{d.value}</dd>
                  </div>
                ))}
              </dl>, 'details') : null}
          </div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
