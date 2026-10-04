import { focusRing } from '../button-styles';
import { Icon } from '../icons';

/**
 * SliderArrows: setas do carrossel (F14 FR-10), dois botões de 44 px (raio 14, borda 1,5 px) + `counter` opcional ("1–3 de 6", só quando N > 3, 13 px/600, à esquerda).
 * `prevLabel`/`nextLabel` = aria-label ("Mapas anteriores", "Próximos mapas"). `prevDisabled`/`nextDisabled` usam `disabled` real e opacidade .4 (o app liga ao estado do Swiper).
 * Sem className; a transição de opacidade (200 ms) some com Reduzir movimento.
 */
export type SliderArrowsProps = {
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  counter?: string;
};

const btn = `flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-border-strong bg-surface text-ink transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

export function SliderArrows({ prevLabel, nextLabel, onPrev, onNext, prevDisabled = false, nextDisabled = false, counter }: SliderArrowsProps) {
  return (
    <div className="flex items-center gap-2.5">
      {counter ? <span className="mr-1.5 text-[13px] font-semibold text-muted">{counter}</span> : null}
      <button type="button" aria-label={prevLabel} disabled={prevDisabled} onClick={onPrev} className={btn}><Icon name="left" size={20} /></button>
      <button type="button" aria-label={nextLabel} disabled={nextDisabled} onClick={onNext} className={btn}><Icon name="right" size={20} /></button>
    </div>
  );
}
