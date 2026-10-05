'use client';

import { Button } from '../button';
import { Icon } from '../icons';
import { SkeletonBlock, SkeletonRegion } from '../skeleton';
import type { CalendarView } from './types';

/** CalendarEmptyState (F25 FR-19): cartão tracejado "Seu calendário está vazio" com "Adicionar a primeira prova". Aparece acima da grade (que continua visível). */
export function CalendarEmptyState({ title, body, cta, onAdd }: { title: string; body: string; cta: string; onAdd: () => void }) {
  return (
    <div className="flex items-center gap-4 rounded-list border border-dashed border-border-strong bg-primary-tint px-6 py-[18px] max-sm:flex-col max-sm:items-start">
      <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-[18px] bg-surface text-primary-deep"><Icon name="calendar" size={28} /></span>
      <span className="flex grow flex-col leading-snug"><span className="font-display text-xl font-extrabold text-ink">{title}</span><span className="text-[15px] text-ink-2">{body}</span></span>
      <Button size="lg" onClick={onAdd}>{cta}</Button>
    </div>
  );
}

/** CalendarSkeleton (F25 FR-19): esqueleto por visão (`role="status"`, `aria-busy`); `label` só para leitor de tela. */
export function CalendarSkeleton({ view, label }: { view: CalendarView; label: string }) {
  return (
    <SkeletonRegion label={label}>
      {view === 'month' ? (
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-list border border-border bg-border">
          {Array.from({ length: 42 }, (_, i) => <div key={i} className="min-h-[96px] bg-surface p-2"><SkeletonBlock width={24} height={24} radius={12} /></div>)}
        </div>
      ) : view === 'week' ? (
        <div className="flex gap-2 rounded-list border border-border bg-surface p-3">
          {Array.from({ length: 7 }, (_, i) => <div key={i} className="flex grow basis-0 flex-col gap-2"><SkeletonBlock height={36} radius={10} /><SkeletonBlock height={i % 2 ? 96 : 56} radius={10} /><SkeletonBlock height={64} radius={10} /></div>)}
        </div>
      ) : view === 'agenda' ? (
        <div className="flex flex-col gap-3 rounded-list border border-border bg-surface p-4">
          {Array.from({ length: 5 }, (_, i) => <div key={i} className="flex items-center gap-4"><SkeletonBlock width={52} height={52} radius={26} /><SkeletonBlock height={52} radius={12} flex={1} /></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="flex flex-col gap-3 overflow-hidden rounded-list border border-border bg-surface"><SkeletonBlock height={140} radius={0} /><div className="flex flex-col gap-2 p-4"><SkeletonBlock height={20} /><SkeletonBlock height={14} width="60%" /></div></div>)}
        </div>
      )}
    </SkeletonRegion>
  );
}
