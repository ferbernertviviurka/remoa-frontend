'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Card, CardDetail, CardShape, CardType, MapState, SaveCardInput } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { CreateCardSheet, useToast, type CreateCardKind } from '@remoa/ui';
import { api } from '@/lib/api';
import { usePaywall } from '@/features/billing/paywall';
import { useEntitlements } from '@/features/shell/entitlements';
import { buildSaveInput } from '../draft';
import { checkFile, uploadImage } from '../upload';
import { blockedReason, createAvailability } from './availability';
import { MobileCardEditor } from './mobile-card-editor';

/** What the mobile map (T5) gives the creator. The map owns the graph, the op queue and the viewport. */
export type CardCreatorHost = {
  /** adds a card of `type` near the selected card / view centre (use `placeCard`) and returns its id; `null` = refused (e.g. 500 per map) */
  createCard: (type: CardType) => string | null;
  /** removes a card created by the creator (undo of an abandoned new card) */
  discardCard: (cardId: string) => void;
  /** the card as the map knows it */
  getCard: (cardId: string) => Card | undefined;
  /** resolves true once the card exists server-side */
  prepare: (cardId: string) => Promise<boolean>;
  /** after a save: the map updates the node (and its detail cache) */
  onSaved: (detail: CardDetail, input: SaveCardInput) => void;
  /** after a save of a card: centre and select it */
  focusCard: (cardId: string) => void;
  subs?: (cardId: string) => Record<string, { state: MapState }> | undefined;
  onShape?: (cardId: string, shape: CardShape) => void;
};

const typeOf = { concept: 'concept', flowchart: 'flow', case: 'case', image: 'image' } as const;

/**
 * F23 FR-13/FR-14: owns the "Criar card" sheet and the full-height editor.
 * `openSheet` is the FloatingMapBar's `onCreate`; `openEditor(cardId)` is for the peek's "Editar" (T6). Render `element` once.
 * ponytail: PDF, Anki and IA go to `/app/mapas/novo` (they create a NEW map); importing into the current map needs an API
 * that appends to a board (P-287).
 */
export function useMobileCardCreator(host: CardCreatorHost): { openSheet: () => void; openEditor: (cardId: string) => void; sheetOpen: boolean; editorOpen: boolean; element: ReactNode } {
  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState<{ id: string; isNew: boolean } | null>(null);
  const router = useRouter();
  const paywall = usePaywall();
  const { entitlements } = useEntitlements();
  const { toast } = useToast();
  const file = useRef<HTMLInputElement>(null);

  const openEditor = useCallback((id: string) => setEditing({ id, isNew: false }), []);
  const openSheet = useCallback(() => setSheet(true), []);

  const select = (kind: CreateCardKind) => {
    setSheet(false);
    if (kind === 'photo') return file.current?.click(); // the camera needs the tap that got us here
    if (kind === 'pdf' || kind === 'anki') return router.push(`/app/mapas/novo?caminho=${kind}`);
    if (kind === 'ai') return router.push('/app/mapas/novo?caminho=pdf');
    const id = host.createCard(typeOf[kind]);
    if (id) setEditing({ id, isNew: true });
    else toast({ title: t('mapMobile.editor.cardError'), tone: 'danger' });
  };

  async function photo(f: File) {
    const fail = (id?: string | null) => {
      if (id) host.discardCard(id);
      toast({ title: t('mapMobile.editor.photoError'), tone: 'danger' });
    };
    if (checkFile(f)) return fail();
    const id = host.createCard('image');
    if (!id) return fail();
    try {
      const up = (await host.prepare(id)) && (await uploadImage(f, { license: 'own', attribution: null }, () => undefined));
      if (!up || !up.ok) return fail(id);
      const built = buildSaveInput({
        id, type: 'image', title: t('map.newCardTitle.image'), front: '', back: '', source: '', shape: 'rect', frontAssetId: null, backAssetId: null, assetId: up.data.id, masks: [],
      });
      if (!built.ok) return fail(id);
      const r = await api<CardDetail>(`/v1/cards/${id}`, { method: 'PUT', body: JSON.stringify(built.data) });
      if (!r.ok) return fail(id);
      host.onSaved(r.data, built.data);
      setEditing({ id, isNew: true });
    } catch {
      fail(id);
    }
  }

  const card = editing ? host.getCard(editing.id) : undefined;
  const element = (
    <>
      <CreateCardSheet
        open={sheet}
        onOpenChange={setSheet}
        title={t('mapMobile.createSheet.title')}
        closeLabel={t('mapMobile.createSheet.closeLabel')}
        groups={{ scratch: t('mapMobile.createSheet.fromScratch'), fast: t('mapMobile.createSheet.faster') }}
        labels={{
          concept: { title: t('mapMobile.createSheet.options.concept') },
          flowchart: { title: t('mapMobile.createSheet.options.flow') },
          case: { title: t('mapMobile.createSheet.options.case') },
          image: { title: t('mapMobile.createSheet.options.image') },
          photo: { title: t('mapMobile.createSheet.options.photo.title'), description: t('mapMobile.createSheet.options.photo.sub') },
          ai: { title: t('mapMobile.createSheet.options.ai.title') },
          pdf: { title: t('mapMobile.createSheet.options.pdf.title') },
          anki: { title: t('mapMobile.createSheet.options.anki.title'), description: t('mapMobile.createSheet.options.anki.sub') },
        }}
        badges={{ pro: t('mapMobile.createSheet.badgePro'), soon: t('mapMobile.createSheet.blockedBeta') }}
        availability={createAvailability(entitlements)}
        onSelect={select}
        onBlocked={(kind) => {
          setSheet(false);
          paywall.show(blockedReason(kind));
        }}
      />
      <input
        ref={file}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        aria-label={t('mapMobile.editor.photoCapture')}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void photo(f);
        }}
      />
      {editing && card ? (
        <MobileCardEditor
          card={card}
          isNew={editing.isNew}
          subs={host.subs?.(card.id)}
          prepare={host.prepare}
          onSaved={host.onSaved}
          onShape={host.onShape}
          onClose={(result) => {
            if (result === 'saved') host.focusCard(editing.id);
            else if (editing.isNew) host.discardCard(editing.id);
            setEditing(null);
          }}
        />
      ) : null}
    </>
  );
  return { openSheet, openEditor, sheetOpen: sheet, editorOpen: !!editing, element };
}
