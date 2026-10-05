'use client';

import type { Entitlements, ReviewHub } from '@remoa/contracts';
import { t, type StringKey } from '@remoa/strings';
import { Alert, Button, Icon, RingProgress, SegmentBar, SwitchRow, ToggleChip } from '@remoa/ui';
import { type Chips, type Reason } from './hub-math';
import { useCountUp } from './use-count-up';

export type QueueModel = { counts: Record<Reason, number>; size: number; minutes: number; firstDue?: ReviewHub['maps'][number] };

type Props = {
  hub: ReviewHub;
  plan: Entitlements['plan'];
  model: QueueModel;
  chips: Chips;
  onChip: (r: Reason, on: boolean) => void;
  boards: ReadonlySet<string>;
  onBoard: (id: string, on: boolean) => void;
  starting: boolean;
  failed: boolean;
  onStart: () => void;
  onAhead: () => void;
};

const COLOR = { due: 'var(--state-review-border)', new: 'var(--primary)', weak: 'var(--state-watch-border)' } as const;
const area = (a: string) => t(`boards.area.${a as 'CM'}` as StringKey);

/** T4: "Revisar" queue panel (mock Revisar.dc.html, section t-fila): ring, composition, chips, maps, CTA. Everything recomputes here from `hub.queue.items`, with no request. */
export function QueuePanel({ hub, plan, model, chips, onChip, boards, onBoard, starting, failed, onStart, onAhead }: Props) {
  const n = useCountUp(700);
  const { counts, size } = model;
  const hasCards = hub.status !== 'empty';
  const reviewed = hub.today.reviewed;
  const total = reviewed + size;
  const ringMax = hasCards ? (total > 0 ? total : 1) : 1;
  const ringValue = hasCards ? (total > 0 ? reviewed : 1) : 0;
  const title = !hasCards ? t('review.hub.panel.heroEmpty') : size > 0 ? t('review.hub.panel.heroPending', { n: size }) : t('review.hub.panel.heroDone');
  const text = !hasCards
    ? t('review.hub.panel.textEmpty')
    : size > 0
      ? model.firstDue
        ? t('review.hub.panel.textStartsBy', { board: model.firstDue.title })
        : t('review.hub.panel.textOnlyNew')
      : t('review.hub.panel.textDone', { n: hub.queue.dueTomorrow });
  const chipDefs = [
    { id: 'due', title: t('review.hub.panel.due'), sub: t('review.hub.panel.dueSub') },
    { id: 'new', title: t('review.hub.panel.new'), sub: hub.queue.newLimit === null ? t('review.hub.panel.newSubNone') : t('review.hub.panel.newSub', { n: hub.queue.newLimit }) },
    { id: 'weak', title: t('review.hub.panel.weak'), sub: t('review.hub.panel.weakSub') },
  ] as const;

  return (
    <section aria-labelledby="t-fila" className="grid grid-cols-1 overflow-hidden rounded-[40px] border border-border bg-surface shadow-[0_24px_60px_rgba(36,26,92,.08)] lg:grid-cols-[320px_minmax(0,1fr)_400px]">
      <div className="flex flex-col items-center justify-center gap-4 bg-panel-dark px-6 py-8 text-on-dark">
        <RingProgress value={ringValue} max={ringMax} label={t('review.hub.panel.ringLabel', { done: reviewed, total })}>
          {size > 0 ? (
            <>
              <span className="font-display text-[68px] font-extrabold leading-none tracking-[-.05em] tabular-nums">{n(size)}</span>
              <span className="text-[15px] text-on-dark-muted">{t('review.hub.panel.inQueue')}</span>
            </>
          ) : (
            <>
              <span aria-hidden="true" className="pop flex size-[84px] items-center justify-center rounded-full bg-[#C9BFFF] text-panel-dark">
                <Icon name="check" size={44} />
              </span>
              <span className="mt-2 text-sm font-bold text-on-dark-muted">{hasCards ? t('review.hub.panel.upToDate') : t('review.hub.panel.noCards')}</span>
            </>
          )}
        </RingProgress>
        <span className="flex items-center gap-2 text-sm text-on-dark-muted">
          <span aria-hidden="true" className="size-[9px] rounded-full bg-[#FDBA74]" />
          {t('review.hub.panel.doneToday', { n: reviewed })}
        </span>
      </div>

      <div className="box-border flex min-w-0 flex-col gap-[18px] px-[34px] py-8 max-lg:px-5">
        <div className="flex flex-col gap-1.5">
          <h2 id="t-fila" className="m-0 font-display text-[28px] font-extrabold leading-[1.1] tracking-[-.03em]">{title}</h2>
          <p className="m-0 text-muted">{text}</p>
        </div>
        <SegmentBar
          summary={t('review.hub.panel.composition', { due: chips.due ? counts.due : 0, new: chips.new ? counts.new : 0, weak: chips.weak ? counts.weak : 0 })}
          segments={chipDefs.map((c) => ({ id: c.id, value: chips[c.id] ? counts[c.id] : 0, color: COLOR[c.id] }))}
        />
        <div role="group" aria-label={t('review.hub.panel.chipsLabel')} className="flex flex-wrap gap-2.5">
          {chipDefs.map((c) => (
            <ToggleChip key={c.id} pressed={chips[c.id]} onPressedChange={(v) => onChip(c.id, v)} title={c.title} sub={c.sub} count={counts[c.id]} color={COLOR[c.id]} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-1 text-sm text-ink-2">
          <span className="flex items-center gap-2 font-bold">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3.2 2" />
            </svg>
            {t('review.hub.panel.time', { n: model.minutes })}
          </span>
          <span className="text-muted">{hub.queue.newLimit === null ? t('review.hub.panel.limitNone') : t(plan === 'free' ? 'review.hub.panel.limitFree' : 'review.hub.panel.limitPro', { n: hub.queue.newLimit })}</span>
        </div>
      </div>

      <div className="box-border flex flex-col gap-3 border-t border-border bg-[#FBFAFE] px-[26px] py-7 lg:border-l lg:border-t-0">
        <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">{t('review.hub.panel.maps')}</span>
        <div role="group" aria-label={t('review.hub.panel.maps')} className="flex max-h-[212px] flex-col gap-1.5 overflow-auto">
          {hub.maps.map((m) => (
            <SwitchRow key={m.boardId} checked={boards.has(m.boardId)} onCheckedChange={(v) => onBoard(m.boardId, v)} title={m.title} sub={area(m.area)} chip={`${m.due} + ${m.new}`} />
          ))}
        </div>
        <span className="grow" />
        {failed ? <Alert tone="review" role="alert" title={t('review.hub.panel.startError')} /> : null}
        {hasCards && size > 0 ? (
          <Button size="cta" loading={starting} onClick={onStart} icon={<Icon name="bolt" size={24} />}>
            {t('review.hub.panel.start', { n: size })}
          </Button>
        ) : hasCards && hub.queue.aheadCount > 0 ? (
          <Button size="cta" variant="secondary" loading={starting} onClick={onAhead} icon={<Icon name="bolt" size={22} />}>
            {t('review.hub.panel.ahead')}
          </Button>
        ) : null}
        {hasCards ? <span className="text-center text-[12.5px] text-muted">{size > 0 ? t('review.hub.panel.noteStart') : t('review.hub.panel.noteAhead')}</span> : null}
      </div>
    </section>
  );
}
