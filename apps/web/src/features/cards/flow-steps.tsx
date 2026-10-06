'use client';

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type Announcements, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FlowStep, MapState } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button, IconButton, Input, Tag } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { newStep } from './draft';
import { ImageSlot } from './image-field';

const t = withStrings({ canvas: more.canvas, cards: more.cards });

export const MIN_STEPS = 2;
export const MAX_STEPS = 12;
type Subs = Record<string, { state: MapState }> | undefined;

/** FR-2: ordered steps, add/remove (2..12), reorder by drag or keyboard; colour per step from FSRS `subs`; an image per step (D-201). */
export function FlowSteps({ title, steps, onChange, subs }: { title: string; steps: FlowStep[]; onChange: (steps: FlowStep[]) => void; subs?: Subs }) {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const pos = (id: string | number) => steps.findIndex((s) => s.id === id) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => t('cards.flow.dnd.start', { n: pos(active.id) }),
    onDragOver: ({ active, over }) => (over ? t('cards.flow.dnd.over', { n: pos(active.id), to: pos(over.id) }) : undefined),
    onDragEnd: ({ active, over }) => (over ? t('cards.flow.dnd.end', { n: pos(active.id), to: pos(over.id) }) : undefined),
    onDragCancel: () => t('cards.flow.dnd.cancel'),
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onChange(arrayMove(steps, pos(active.id) - 1, pos(over.id) - 1));
  };
  const update = (i: number, patch: Partial<FlowStep>) => onChange(steps.map((s, k) => (k === i ? { ...s, ...patch } : s)));

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-xs font-semibold text-text">{t('cards.flow.stepsLabel')}</legend>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{ announcements, screenReaderInstructions: { draggable: t('cards.flow.dnd.instructions') } }}
      >
        <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ol className="flex flex-col gap-3">
            {steps.map((s, i) => (
              <Step
                key={s.id}
                step={s}
                n={i + 1}
                title={title}
                state={subs?.[s.id]?.state}
                canRemove={steps.length > MIN_STEPS}
                onText={(text) => update(i, { text })}
                onNote={(note) => update(i, { note })}
                onImage={(assetId) => onChange(steps.map((x, k) => (k !== i ? x : assetId ? { ...x, assetId } : { id: x.id, text: x.text, ...(x.note ? { note: x.note } : {}) })))}
                onRemove={() => onChange(steps.filter((_, k) => k !== i))}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <Button
        variant="secondary"
        disabled={steps.length >= MAX_STEPS}
        onClick={() => {
          onChange([...steps, newStep()]);
          track('flow_step_added', {});
        }}
      >
        {t('cards.flow.add')}
      </Button>
      {steps.length >= MAX_STEPS ? <p className="text-xs text-muted">{t('cards.flow.max')}</p> : null}
      {steps.length <= MIN_STEPS ? <p className="text-xs text-muted">{t('cards.flow.min')}</p> : null}
    </fieldset>
  );
}

type StepProps = {
  step: FlowStep;
  n: number;
  title: string;
  state: MapState | undefined;
  canRemove: boolean;
  onText: (v: string) => void;
  onNote: (v: string) => void;
  onImage: (assetId: string | null) => void;
  onRemove: () => void;
};

function Step({ step, n, title, state, canRemove, onText, onNote, onImage, onRemove }: StepProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  return (
    <li
      ref={setNodeRef}
      data-step-id={step.id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-col gap-2 rounded-map border bg-surface p-2 ${isDragging ? 'z-10 border-primary shadow-lift' : 'border-border'}`}
    >
      <div className="flex items-center gap-1">
        <IconButton ref={setActivatorNodeRef} aria-label={t('cards.flow.drag', { n })} {...attributes} {...listeners}>
          <svg width="14" height="14" viewBox="0 0 14 14">
            {[3, 7, 11].flatMap((y) => [4, 10].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" fill="currentColor" />))}
          </svg>
        </IconButton>
        <span className="text-xs font-bold text-muted">{t('cards.flow.step', { n })}</span>
        {state ? <Tag tone={state}>{t(`mapState.${state}`)}</Tag> : null}
        <span className="ml-auto">
          <IconButton aria-label={t('cards.flow.remove', { n })} disabled={!canRemove} onClick={onRemove}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </IconButton>
        </span>
      </div>
      <Input label={t('cards.flow.step', { n })} value={step.text} maxLength={500} onChange={(e) => onText(e.target.value)} />
      <Input label={t('cards.flow.note', { n })} value={step.note ?? ''} maxLength={1000} onChange={(e) => onNote(e.target.value)} />
      <ImageSlot
        label={t('cards.flow.image', { n })}
        alt={t('canvas.stepImageAlt', { n, title })}
        addLabel={t('cards.flow.addImage', { n })}
        removeLabel={t('cards.flow.removeImage', { n })}
        assetId={step.assetId ?? null}
        onChange={onImage}
      />
    </li>
  );
}
