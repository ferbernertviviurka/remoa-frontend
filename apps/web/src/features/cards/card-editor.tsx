'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { TextMorph } from 'torph/react';
import { caseStages, type Card, type CardDetail, type CardShape, type MapState, type Rubric, type SaveCardInput } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, Button, Input, Skeleton, Tag, Textarea } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { buildSaveInput, toDraft, type Draft } from './draft';
import { FlowSteps } from './flow-steps';
import { CaseStageHelp } from './case-stage-help';
import { AnswerImage, ImageField, ImageSlot, QuestionImage } from './image-field';
import { ShapePicker } from './shape-picker';
import { Markdown } from './markdown';

export type CardEditorProps = {
  card: Card;
  /** FSRS state per flow step / mask (`RetrievabilityMap[cardId].subs`). */
  subs?: Record<string, { state: MapState }>;
  /** Resolves true once the card exists server-side (its createCard left the map op queue). */
  prepare: (cardId: string) => Promise<boolean>;
  onSaved: (detail: CardDetail, input: SaveCardInput) => void;
  onClose: () => void;
  /** G04: the map node takes the picked shape at once (preview), and the saved one back if the shape autosave fails. */
  onShape?: (cardId: string, shape: CardShape) => void;
  /** F23 T7: the mobile sheet owns Cancel/Save in its header (`<button type="submit" form={formId}>`); the bottom buttons and the shortcut hint go away. */
  formId?: string;
  /** F23 T7: true while the draft differs from what the server has (the sheet asks before discarding). */
  onDirty?: (dirty: boolean) => void;
};

type Load = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; rubric: Rubric | null };

/** Inline editor hosted by the inspector: loads GET /v1/cards/:id, validates with the contract, PUTs. */
export function CardEditor({ card, subs, prepare, onSaved, onClose, onShape, formId, onDirty }: CardEditorProps) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false); // no overlapping PUTs for the same card
  const [attempt, setAttempt] = useState(0);
  // G04 (D-146): the shape saves on its own, on top of what the server has (never the unsaved draft), one PUT at a time
  const saved = useRef<Draft | null>(null);
  const shapeQueue = useRef<Promise<void>>(Promise.resolve());
  const shapeReq = useRef(0);
  const [shapeStatus, setShapeStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    let live = true;
    setLoad({ state: 'loading' });
    (async () => {
      if (!(await prepare(card.id))) return live && setLoad({ state: 'error', message: t('cards.errors.notSynced') });
      const r = await api<CardDetail>(`/v1/cards/${card.id}`);
      if (!live) return;
      if (!r.ok) return setLoad({ state: 'error', message: t(`errors.${r.error.code}`) });
      saved.current = toDraft(r.data);
      setDraft(saved.current);
      setLoad({ state: 'ready', rubric: r.data.rubric ?? null });
    })().catch(() => live && setLoad({ state: 'error', message: t('cards.errors.offline') }));
    return () => {
      live = false;
    };
  }, [card.id, prepare, attempt]);

  useEffect(() => {
    if (draft && saved.current) onDirty?.(JSON.stringify(draft) !== JSON.stringify(saved.current));
  }, [draft, onDirty]);

  const save = useCallback(
    async (d: Draft): Promise<boolean> => {
      if (saving.current) return false;
      const built = buildSaveInput(d);
      if (!built.ok) {
        setErrors(built.errors);
        return false;
      }
      saving.current = true;
      setBusy(true);
      setErrors([]);
      try {
        await shapeQueue.current; // a shape PUT still in flight lands first; this one carries the same shape
        if (!(await prepare(d.id))) {
          setErrors([t('cards.errors.notSynced')]);
          return false;
        }
        const r = await api<CardDetail>(`/v1/cards/${d.id}`, { method: 'PUT', body: JSON.stringify(built.data) });
        if (!r.ok) {
          setErrors([t(`errors.${r.error.code}`)]);
          return false;
        }
        track('card_edited', { type: d.type });
        onSaved(r.data, built.data);
        onClose();
        return true;
      } catch {
        setErrors([t('cards.errors.offline')]);
        return false;
      } finally {
        saving.current = false;
        setBusy(false);
      }
    },
    [prepare, onSaved, onClose],
  );

  const changeShape = (shape: CardShape) => {
    if (!saved.current || shape === draft?.shape) return;
    setDraft((cur) => (cur ? { ...cur, shape } : cur));
    onShape?.(card.id, shape);
    const n = ++shapeReq.current;
    setShapeStatus('saving');
    shapeQueue.current = shapeQueue.current.then(async () => {
      const base = saved.current!; // set: the picker only renders once the card has loaded
      const built = buildSaveInput({ ...base, shape });
      let ok = false;
      try {
        if (built.ok && (await prepare(base.id))) {
          const r = await api<CardDetail>(`/v1/cards/${base.id}`, { method: 'PUT', body: JSON.stringify(built.data) });
          if (r.ok) {
            ok = true;
            saved.current = { ...base, shape };
            track('card_edited', { type: base.type });
            onSaved(r.data, built.data);
          }
        }
      } catch {
        // offline: same rollback as an API error
      }
      if (n !== shapeReq.current) return; // a newer pick is queued: it decides what the node shows
      setShapeStatus(ok ? 'saved' : 'error');
      if (ok) return;
      const back = saved.current!.shape;
      setDraft((cur) => (cur ? { ...cur, shape: back } : cur));
      onShape?.(base.id, back);
    });
  };

  if (load.state === 'loading' || (load.state === 'ready' && !draft))
    return (
      <div role="status" aria-label={t('cards.loading')}>
        <Skeleton lines={5} />
      </div>
    );
  if (load.state === 'error')
    return (
      <Alert tone="review" role="alert" title={load.message}>
        <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
          {t('common.retry')}
        </Button>
        <Button variant="quiet" onClick={onClose}>
          {t('common.cancel')}
        </Button>
      </Alert>
    );
  const d = draft!;
  const set = (patch: Partial<Draft>) => setDraft({ ...d, ...patch } as Draft);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void save(d);
  };
  // FR-10: Enter in a single-line field submits natively; Ctrl/Cmd+Enter in a textarea; Esc cancels.
  // Keys from portals (Select list, mask dialog) bubble through React but are not inside the form: ignore them.
  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (!(e.target instanceof Node) || !e.currentTarget.contains(e.target)) return;
    if (e.key === 'Escape') {
      if (e.target instanceof Element && e.target.closest('[aria-roledescription="sortable"]')) return; // dnd-kit cancels its drag
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && e.target instanceof HTMLTextAreaElement) {
      e.preventDefault();
      void save(d);
    }
  };

  return (
    <form id={formId} aria-label={t('cards.editorLabel', { title: card.title })} className="flex flex-col gap-4" onSubmit={onSubmit} onKeyDown={onKeyDown} noValidate>
      <Input label={t('cards.fields.title')} value={d.title} maxLength={200} required onChange={(e) => set({ title: e.target.value })} />

      {d.type === 'concept' ? (
        <>
          <Textarea label={t('cards.fields.front')} rows={2} value={d.front} maxLength={5000} onChange={(e) => set({ front: e.target.value })} />
          <QuestionImage title={d.title || card.title} assetId={d.frontAssetId} onChange={(frontAssetId) => set({ frontAssetId })} />
          <Textarea label={t('cards.fields.back')} rows={4} value={d.back} maxLength={5000} onChange={(e) => set({ back: e.target.value })} />
          <p className="-mt-2 text-xs text-muted">{t('cards.fields.backHint')}</p>
          {d.back.trim() ? (
            <section aria-label={t('cards.fields.preview')} className="rounded-map border border-border bg-canvas p-3">
              <Markdown text={d.back} />
            </section>
          ) : null}
          <AnswerImage title={d.title || card.title} assetId={d.backAssetId} onChange={(backAssetId) => set({ backAssetId })} />
        </>
      ) : null}

      {d.type === 'note' ? (
        <>
          <p className="-mt-2 text-xs text-muted">{t('cards.fields.noteHint')}</p>
          <Textarea label={t('cards.fields.text')} rows={5} value={d.front} maxLength={5000} onChange={(e) => set({ front: e.target.value })} />
          <p className="-mt-2 text-xs text-muted">{t('cards.fields.backHint')}</p>
          <QuestionImage title={d.title || card.title} assetId={d.frontAssetId} onChange={(frontAssetId) => set({ frontAssetId })} />
        </>
      ) : null}

      {d.type === 'concept' ? (
        <>
          <ShapePicker value={d.shape} onChange={changeShape} />
          <p role="status" className={`-mt-2 text-xs ${shapeStatus === 'error' ? 'text-review-text' : 'text-muted'}`}>
            <TextMorph locale="pt-BR">{shapeStatus === 'idle' ? '' : t(`cards.shape.${shapeStatus}`)}</TextMorph>
          </p>
          {d.frontAssetId && d.shape !== 'rect' ? <p className="-mt-2 text-xs text-muted">{t('cards.shape.imageHint')}</p> : null}
        </>
      ) : null}

      {d.type === 'flow' || d.type === 'case' ? (
        <QuestionImage title={d.title || card.title} assetId={d.frontAssetId} onChange={(frontAssetId) => set({ frontAssetId })} />
      ) : null}

      {d.type === 'flow' ? <FlowSteps title={d.title || card.title} steps={d.steps} subs={subs} onChange={(steps) => set({ steps })} /> : null}

      {d.type === 'case' ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-xs font-semibold text-text">{t('cards.case.stagesLabel')}</legend>
          {caseStages.map((stage) => (
            <div key={stage} className="relative flex flex-col gap-2 rounded-map border border-border p-2">
              {/* G06: same "what is this stage / what filling it changes" tooltip as the map node, beside the field label */}
              <span className="absolute right-1 top-0">
                <CaseStageHelp stage={stage} iconOnly />
              </span>
              <Textarea
                label={t(`cards.case.stage.${stage}`)}
                rows={2}
                value={d.stages[stage]}
                maxLength={2000}
                onChange={(e) => set({ stages: { ...d.stages, [stage]: e.target.value } })}
              />
              <ImageSlot
                label={t('cards.case.image', { stage: t(`cards.case.stage.${stage}`) })}
                alt={t('canvas.stageImageAlt', { stage: t(`cards.case.stage.${stage}`), title: d.title || card.title })}
                addLabel={t('cards.case.addImage', { stage: t(`cards.case.stage.${stage}`) })}
                removeLabel={t('cards.case.removeImage', { stage: t(`cards.case.stage.${stage}`) })}
                assetId={d.stageAssets[stage]}
                onChange={(id) => set({ stageAssets: { ...d.stageAssets, [stage]: id } })}
              />
            </div>
          ))}
        </fieldset>
      ) : null}

      {d.type === 'flow' || d.type === 'case' ? (
        <AnswerImage title={d.title || card.title} assetId={d.backAssetId} onChange={(backAssetId) => set({ backAssetId })} />
      ) : null}

      {d.type === 'image' ? (
        <ImageField
          title={d.title || card.title}
          assetId={d.assetId}
          masks={d.masks}
          busy={busy}
          error={errors[0]}
          onAsset={(assetId) => set({ assetId })}
          onSaveMasks={(masks) => {
            const next = { ...d, masks };
            setDraft(next);
            return save(next);
          }}
        />
      ) : null}

      <Input
        label={t('cards.fields.source')}
        placeholder={t('cards.fields.sourcePlaceholder')}
        value={d.source}
        maxLength={1000}
        onChange={(e) => set({ source: e.target.value })}
      />

      {errors.length ? (
        <Alert tone="review" role="alert" title={t('errors.validation')}>
          <ul className="list-disc pl-5">
            {errors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {d.type === 'note' ? null : <RubricView rubric={load.rubric} />}

      {formId ? null : (
        <>
          <p className="text-xs text-muted">{t('cards.shortcuts')}</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={busy} loadingLabel={t('cards.saving')}>
              {t('common.save')}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

/** FR-7 (P1): approved/draft rubric read-only; generation is F05. */
function RubricView({ rubric }: { rubric: Rubric | null }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-bold uppercase tracking-[.13em] text-muted">{t('cards.rubric.title')}</h3>
      {rubric ? (
        <>
          <Tag tone={rubric.status === 'approved' ? 'steady' : 'watch'}>
            {t(rubric.status === 'approved' ? 'map.inspector.status.approved' : 'map.inspector.status.draft')}
          </Tag>
          <ul className="flex flex-col gap-1 text-sm">
            {rubric.points.map((p) => (
              <li key={p.text} className="flex items-start gap-2">
                <span>{p.text}</span>
                {p.essential ? <Tag tone="review">{t('cards.rubric.essential')}</Tag> : null}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('cards.rubric.source', { source: rubric.source })}</p>
        </>
      ) : null}
    </section>
  );
}
