'use client';

import { clsx } from 'clsx';
import { focusRing } from '../button-styles';
import { MapGlyph, type MapGlyphName } from './glyph';

export type MapCardType = 'concept' | 'flow' | 'case' | 'image' | 'note';
export type MapCardState = 'review' | 'watch' | 'steady' | 'unknown';
/** `full` = a partir de 80% (resumo, passos, miniatura, lembrança); `overview` = abaixo (só tipo, título 19 px e estado). */
export type MapCardLevel = 'full' | 'overview';

/** F23 FR-5: 152 de largura; altura por tipo (fluxograma 172, imagem 140). */
export const MAP_CARD_W = 152;
export const MAP_CARD_H: Record<MapCardType, number> = { concept: 124, case: 124, note: 124, flow: 172, image: 140 };

export type MapCardProps = {
  type: MapCardType;
  typeLabel: string;
  title: string;
  state: MapCardState;
  stateLabel: string;
  /** Texto pronto ("94%"); só no nível `full`. */
  recallLabel?: string;
  /** Resumo (conceito, caso, conteúdo); até 3 linhas. Só no nível `full`. */
  summary?: string;
  /** Fluxograma: primeiros passos e o "+ N passos" (ou a contagem quando o texto dos passos ainda não chegou). */
  steps?: readonly string[];
  stepsMore?: string;
  /** Imagem: miniatura (`null` = placeholder com máscaras). */
  image?: { src: string | null; alt: string };
  level?: MapCardLevel;
  selected?: boolean;
  /** Busca: sem correspondência = 22% de opacidade. */
  dimmed?: boolean;
  /** Camada "Mapa de calor da memória": borda e rodapé na cor do estado; desligada = neutra. Default ligada. */
  heat?: boolean;
  /** Tamanho salvo do card (`card.size`, D-1207); ausente = padrão do tipo. */
  size?: { w: number; h: number };
  /** Modo conectar: candidato a destino (contorno tracejado). */
  target?: boolean;
  /** Nome acessível do botão (título, tipo, estado e lembrança). */
  selectLabel: string;
  onSelect?: () => void;
};

const typeIcon: Record<MapCardType, MapGlyphName> = { concept: 'concept', flow: 'flow', case: 'case', image: 'image', note: 'book' };
const border: Record<MapCardState, string> = {
  review: 'border-(--state-review-border)', watch: 'border-(--state-watch-border)', steady: 'border-(--state-steady-border)', unknown: 'border-(--state-unknown-border)',
};
const dot: Record<MapCardState, string> = {
  review: 'bg-(--state-review-border)', watch: 'bg-(--state-watch-border)', steady: 'bg-(--state-steady-border)', unknown: 'bg-(--state-unknown-soft)',
};
const foot: Record<MapCardState, string> = {
  review: 'text-(--state-review-text)', watch: 'text-(--state-watch-text)', steady: 'text-ink-2', unknown: 'text-muted',
};

/**
 * MapCard (F23 FR-5/FR-6): card compacto do mapa no celular (`MapaMobileMapa.dc.html`). Um `<button>` real que ocupa o nó
 * (≥ 44 px). Título 16 px/800 e resumo 12,5 px (tokens `--map-text-*`), rodapé com ponto e estado (12 px: o mock tem 11,5), barra de 5 px na cor do estado. `selected` desenha anel e sombra; só `opacity`/`box-shadow` mudam.
 */
export function MapCard({ type, typeLabel, title, state, stateLabel, recallLabel, summary, steps, stepsMore, image, level = 'full', selected, dimmed, heat = true, size, target, selectLabel, onSelect }: MapCardProps) {
  const full = level === 'full';
  return (
    <button
      type="button"
      aria-label={selectLabel}
      aria-pressed={!!selected}
      data-level={level}
      data-state={state}
      data-dimmed={dimmed || undefined}
      data-connect-target={target || undefined}
      onClick={onSelect}
      style={{ width: size?.w ?? MAP_CARD_W, height: size?.h ?? MAP_CARD_H[type] }}
      className={clsx(
        'relative flex cursor-pointer flex-col overflow-hidden rounded-[20px] border-[2.5px] bg-surface p-0 text-left text-ink transition-[opacity,box-shadow,border-color] duration-300',
        selected ? 'border-primary shadow-[0_0_0_5px_rgba(109,91,208,.22),0_14px_30px_rgba(36,26,92,.2)]' : clsx(heat ? border[state] : 'border-(--border)', 'shadow-[0_8px_20px_rgba(36,26,92,.1)]'),
        target && 'outline-2 outline-offset-[5px] outline-primary outline-dashed',
        dimmed ? 'opacity-[.22]' : 'opacity-100',
        focusRing,
      )}
    >
      <span className="flex items-center justify-between px-[11px] pt-[9px]">
        <span className="flex items-center gap-[5px] text-xs font-bold text-muted">
          <MapGlyph name={typeIcon[type]} size={14} />
          {typeLabel}
        </span>
        {full && recallLabel ? <span className={clsx('text-xs font-extrabold', heat ? foot[state] : 'text-muted')}>{recallLabel}</span> : null}
      </span>
      <span
        className={clsx('block px-[11px] pt-[5px] font-display font-extrabold leading-[1.15] tracking-[-.02em]', !full && 'line-clamp-3')}
        style={{ fontSize: full ? 'var(--map-text-title)' : 'var(--map-text-overview)' }}
      >
        {title}
      </span>
      {full && summary && type !== 'flow' && type !== 'image' ? (
        <span className="line-clamp-3 block px-[11px] pt-[5px] leading-[1.38] text-ink-2" style={{ fontSize: 'var(--map-text-summary)' }}>{summary}</span>
      ) : null}
      {full && type === 'flow' ? (
        <span className="flex flex-col gap-[5px] px-[11px] pt-[7px]">
          {steps?.map((s, i) => (
            <span key={i} className="flex items-center gap-1.5 text-xs text-ink-2">
              <span aria-hidden="true" className="flex size-[17px] shrink-0 items-center justify-center rounded-full bg-(--divider) text-xs font-extrabold text-primary-deep">{i + 1}</span>
              <span className="truncate">{s}</span>
            </span>
          ))}
          {stepsMore ? <span className="text-xs font-bold text-muted">{stepsMore}</span> : null}
        </span>
      ) : null}
      {full && type === 'image' ? (
        <span role={image && !image.src ? 'img' : undefined} aria-label={image && !image.src ? image.alt : undefined} className="relative mx-[11px] mt-[7px] block h-[54px] overflow-hidden rounded-[10px] bg-(--divider)">
          {image?.src ? (
            <img src={image.src} alt={image.alt} loading="lazy" draggable={false} className="size-full object-cover" />
          ) : (
            <>
              <span aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-[34px] rounded bg-apricot" />
              <span aria-hidden="true" className="absolute left-[70px] top-[26px] h-4 w-10 rounded bg-apricot" />
              <span aria-hidden="true" className="absolute left-24 top-2 h-3.5 w-6 rounded bg-apricot" />
            </>
          )}
        </span>
      ) : null}
      <span className={clsx('mt-auto flex items-center gap-1.5 px-[11px] pb-[9px] text-xs font-bold', heat ? foot[state] : 'text-muted')}>
        <span aria-hidden="true" className={clsx('size-2 rounded-full', heat ? dot[state] : 'bg-(--state-unknown-soft)')} />
        {stateLabel}
      </span>
      <span aria-hidden="true" className={clsx('absolute inset-x-0 bottom-0 h-[5px] transition-colors duration-300', heat ? dot[state] : 'bg-(--state-unknown-soft)')} />
    </button>
  );
}

/** Rótulo de conexão no celular (F23 FR-7): pílula 11,5 px (`--map-text-edge`); sem rótulo = âmbar ("sem rótulo"); `hot` = conexão do card selecionado. */
export function MapEdgeLabel({ label, empty, hot, onClick, buttonLabel }: { label: string; empty?: boolean; hot?: boolean; onClick?: () => void; buttonLabel?: string }) {
  const cls = clsx(
    'whitespace-nowrap rounded-pill border px-[9px] py-0.5 font-bold',
    empty ? 'border-[#fcd34d] bg-(--state-watch-bg) text-(--state-watch-text)' : clsx('border-(--border) bg-surface', hot ? 'text-primary-deep' : 'text-ink-2'),
  );
  const style = { fontSize: 'var(--map-text-edge)' };
  if (!onClick) return <span className={cls} style={style}>{label}</span>;
  return <button type="button" aria-label={buttonLabel} onClick={onClick} style={style} className={clsx(cls, 'cursor-pointer', focusRing)}>{label}</button>;
}
