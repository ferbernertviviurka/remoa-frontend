'use client';

import type { CalendarView } from './types';

/**
 * CalendarViewSwitch (F25 FR-3): Mês · Semana · Agenda · Galeria com marcador branco que desliza (400 ms).
 * Trilho e opções iguais ao `Segmented` (38 px; 44 no celular); o marcador exige largura igual por opção, por isso não reaproveita o Radix ToggleGroup.
 * Botões com `aria-pressed`; setas esquerda/direita trocam de visão.
 */
export type CalendarViewSwitchProps = {
  value: CalendarView;
  onChange: (view: CalendarView) => void;
  text: { label: string; month: string; week: string; agenda: string; gallery: string };
};

const ORDER: CalendarView[] = ['month', 'week', 'agenda', 'gallery'];

export function CalendarViewSwitch({ value, onChange, text }: CalendarViewSwitchProps) {
  const idx = ORDER.indexOf(value);
  const names = { month: text.month, week: text.week, agenda: text.agenda, gallery: text.gallery };
  return (
    <div
      role="group"
      aria-label={text.label}
      onKeyDown={(e) => {
        const by = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!by) return;
        const next = ORDER[(idx + by + 4) % 4]!;
        onChange(next);
        (e.currentTarget.querySelectorAll('button')[ORDER.indexOf(next)] as HTMLElement | undefined)?.focus();
      }}
      className="relative inline-grid grid-cols-4 rounded-[16px] bg-track p-1"
    >
      <span aria-hidden="true" className="absolute inset-y-1 left-1 w-[calc((100%-8px)/4)] rounded-[12px] bg-surface shadow-sm transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `translateX(${idx * 100}%)` }} />
      {ORDER.map((v) => (
        <button key={v} type="button" aria-pressed={v === value} tabIndex={v === value ? 0 : -1} onClick={() => onChange(v)} className={`relative z-10 h-[38px] min-w-[84px] rounded-[12px] px-4 text-sm font-bold transition-colors duration-[400ms] focus-visible:outline-2 focus-visible:outline-primary max-lg:h-11 ${v === value ? 'text-primary-deep' : 'text-muted'}`}>{names[v]}</button>
      ))}
    </div>
  );
}
