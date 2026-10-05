'use client';

import { Morph } from '../morph';

/**
 * PriceTicker: preço em centavos que se transforma com Torph (`Morph`) ao mudar `value`; `format(cents)` devolve o texto (Intl pt-BR).
 * Algarismos tabulares; leitor de tela recebe o texto real (`aria-live="polite"`). Movimento reduzido: troca direta.
 */
export type PriceTickerProps = { value: number; format: (cents: number) => string };

export function PriceTicker({ value, format }: PriceTickerProps) {
  return (
    <span aria-live="polite" data-testid="ticker-frame" className="tabular-nums">
      <Morph>{format(value)}</Morph>
    </span>
  );
}
