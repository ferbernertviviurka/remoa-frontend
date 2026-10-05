'use client';

import { useCallback, useEffect, useRef, useState, type FocusEvent } from 'react';
import type { Card, CardDetail, CardShape, MapState, SaveCardInput } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, Dialog, Icon, useToast } from '@remoa/ui';
import { api } from '@/lib/api';
import { track } from '@/lib/analytics';
import { usePaywall } from '@/features/billing/paywall';
import { CardEditor } from '../card-editor';

export type MobileCardEditorProps = {
  card: Card;
  /** a card created a moment ago: discarding removes it from the map again */
  isNew: boolean;
  subs?: Record<string, { state: MapState }>;
  prepare: (cardId: string) => Promise<boolean>;
  onSaved: (detail: CardDetail, input: SaveCardInput) => void;
  /** editor closed (saved or discarded) */
  onClose: (result: 'saved' | 'discarded') => void;
  onShape?: (cardId: string, shape: CardShape) => void;
};

const FORM = 'mobile-card-editor';
const titleKey = { concept: 'Concept', note: 'Concept', flow: 'Flow', case: 'Case', image: 'Image' } as const;

/**
 * F23 FR-14: full-height editor over the map. Reuses F02's `CardEditor` (fields, images, flow steps, case stages, the
 * contract schema) and only swaps its chrome: Cancelar / title / Salvar in a header, confirmation before discarding.
 */
export function MobileCardEditor({ card, isNew, subs, prepare, onSaved, onClose, onShape }: MobileCardEditorProps) {
  const [dirty, setDirty] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [kb, setKb] = useState(0);
  const done = useRef(false);
  const paywall = usePaywall();
  const { toast } = useToast();

  // the on-screen keyboard shrinks the visual viewport, not the layout one: pad the form so the last field can scroll above it
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const fit = () => setKb(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    vv.addEventListener('resize', fit);
    return () => vv.removeEventListener('resize', fit);
  }, []);

  const saved = useCallback(
    (d: CardDetail, i: SaveCardInput) => {
      done.current = true;
      onSaved(d, i);
    },
    [onSaved],
  );
  const closed = useRef(false); // Esc reaches both the form and Radix: close once
  const finish = useCallback(
    (r: 'saved' | 'discarded') => {
      if (closed.current) return;
      closed.current = true;
      onClose(r);
    },
    [onClose],
  );
  const request = useCallback(() => {
    if (done.current) return finish('saved');
    if (dirty) return setConfirm(true);
    finish('discarded');
  }, [dirty, finish]);

  const focusIn = (e: FocusEvent) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => el.scrollIntoView?.({ block: 'center', behavior: calm ? 'auto' : 'smooth' }), 250); // after the keyboard opened
  };

  const [rubricBusy, setRubricBusy] = useState(false);
  async function rubric() {
    setRubricBusy(true);
    try {
      if (!(await prepare(card.id))) return toast({ title: t('mapMobile.editor.rubricError'), tone: 'danger' });
      const r = await api('/v1/ai/rubric', { method: 'POST', body: JSON.stringify({ cardId: card.id }) });
      if (r.ok) {
        track('rubric_generated', {});
        toast({ title: t('mapMobile.editor.rubricDone') });
      } else if (!paywall.handle(r.error)) toast({ title: t('mapMobile.editor.rubricError'), tone: 'danger' });
    } catch {
      toast({ title: t('mapMobile.editor.rubricError'), tone: 'danger' });
    } finally {
      setRubricBusy(false);
    }
  }

  const heading = t(`mapMobile.editor.title.${isNew ? 'new' : 'edit'}${titleKey[card.type]}`);
  return (
    <>
      <Dialog open title={heading} closeLabel={t('common.close')} size="full" srOnlyHeader onOpenChange={(o) => !o && request()}>
        <header className="-mt-2 flex shrink-0 items-center justify-between gap-2 border-b border-border pb-3 pr-12">
          <Button variant="quiet" onClick={request}>
            {t('mapMobile.editor.closeLabel')}
          </Button>
          <h2 className="m-0 min-w-0 flex-1 text-center font-display text-base font-extrabold leading-tight">{heading}</h2>
          <Button type="submit" form={FORM}>
            {t('mapMobile.editor.saveLabel')}
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-4" style={{ paddingBottom: kb }} onFocusCapture={focusIn}>
          <CardEditor card={card} subs={subs} prepare={prepare} onSaved={saved} onClose={request} onShape={onShape} formId={FORM} onDirty={setDirty} />
          {card.type === 'note' ? null : (
            <div className="mt-4">
              <Button variant="secondary" loading={rubricBusy} loadingLabel={t('cards.saving')} icon={<Icon name="sparkle" size={20} />} onClick={() => void rubric()}>
                {t('mapMobile.editor.genRubricLabel')}
              </Button>
            </div>
          )}
        </div>
      </Dialog>
      <Dialog open={confirm} onOpenChange={setConfirm} title={t('mapMobile.editor.discardTitle')} description={t('mapMobile.editor.discardBody')} closeLabel={t('common.close')}>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            {t('mapMobile.editor.discardKeep')}
          </Button>
          <Button
            onClick={() => {
              setConfirm(false);
              finish('discarded');
            }}
          >
            {t('mapMobile.editor.discardConfirm')}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
