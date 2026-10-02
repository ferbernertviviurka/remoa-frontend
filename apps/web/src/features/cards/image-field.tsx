'use client';

import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { assetLicenses, imageMimes, type AssetLicense, type CardMask } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, Button, Dialog, Input, Progress, Select } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { MaskEditor, MaskOverlay } from './mask-editor';
import { checkFile, uploadImage, useAsset, type FileProblem } from './upload';

type Upload = { state: 'idle' } | { state: 'sending'; pct: number } | { state: 'failed'; file: File } | { state: 'invalid'; problem: FileProblem | 'noLicense' };

type Props = {
  title: string;
  assetId: string | null;
  masks: CardMask[];
  busy: boolean;
  /** Save failure: shown inside the full-screen dialog, where the form's own alert is hidden behind the overlay. */
  error?: string;
  onAsset: (assetId: string) => void;
  /** Applies the masks and saves the card; resolves true when saved. */
  onSaveMasks: (masks: CardMask[]) => Promise<boolean>;
};

/** FR-3: license + upload (pick, drop or paste) and the thumbnail; FR-4 masks open full screen. */
export function ImageField({ title, assetId, masks, busy, error, onAsset, onSaveMasks }: Props) {
  const [editing, setEditing] = useState<CardMask[] | null>(null);
  const asset = useAsset(assetId);
  const alt = t('cards.image.alt', { title });
  return (
    <section className="flex flex-col gap-3">
      {assetId ? (
        <div className="flex flex-col gap-2">
          <div className="relative overflow-hidden rounded-map border border-border bg-canvas">
            {asset ? <img src={asset.urls.w800} alt={alt} className="block w-full" /> : <div className="h-40" />}
            <MaskOverlay masks={masks} />
          </div>
          <p className="text-xs font-semibold text-muted">{masks.length === 1 ? t('cards.image.masksOne') : t('cards.image.masks', { n: masks.length })}</p>
          <Button variant="secondary" disabled={!asset} onClick={() => setEditing(masks)}>
            {t('cards.image.openMasks')}
          </Button>
        </div>
      ) : null}
      <ImageUpload hasImage={!!assetId} onAsset={onAsset} />

      <Dialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        size="full"
        title={t('cards.mask.editorTitle', { title })}
        description={t('cards.mask.editorDescription')}
        closeLabel={t('common.close')}
      >
        {editing && asset ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <MaskEditor src={asset.urls.w1600} alt={alt} masks={editing} onChange={setEditing} />
            {error ? <Alert tone="review" role="alert" title={error} /> : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                loading={busy}
                loadingLabel={t('cards.saving')}
                onClick={async () => {
                  if (await onSaveMasks(editing)) setEditing(null);
                }}
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </section>
  );
}

/**
 * FR-3 upload, shared by the image card and the question image (D-096): license, then sign → PUT → complete.
 * Pick, drop or paste (paste anywhere inside this block); `onAsset` gets the new asset id.
 */
export function ImageUpload({ hasImage, onAsset }: { hasImage: boolean; onAsset: (assetId: string) => void }) {
  const [license, setLicense] = useState<AssetLicense>('own');
  const [attribution, setAttribution] = useState('');
  const [upload, setUpload] = useState<Upload>({ state: 'idle' });
  const fileInput = useRef<HTMLInputElement>(null);

  async function send(file: File) {
    const problem = checkFile(file);
    if (problem) return setUpload({ state: 'invalid', problem });
    if (license !== 'own' && !attribution.trim()) return setUpload({ state: 'invalid', problem: 'noLicense' });
    setUpload({ state: 'sending', pct: 0 });
    const r = await uploadImage(file, { license, attribution: attribution.trim() || null }, (pct) => setUpload({ state: 'sending', pct }));
    if (!r.ok) return setUpload({ state: 'failed', file });
    setUpload({ state: 'idle' });
    track('image_uploaded', { sizeKb: Math.round(file.size / 1024) });
    onAsset(r.data.id);
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) void send(f);
  };
  const onPaste = (e: ClipboardEvent) => {
    const f = [...e.clipboardData.files][0];
    if (!f) return; // plain text paste goes to the field as usual
    e.preventDefault();
    void send(f);
  };

  const sending = upload.state === 'sending';
  return (
    <div className="flex flex-col gap-3" onPaste={onPaste}>
      <Select
        label={t('cards.image.license')}
        value={license}
        onValueChange={(v) => setLicense(v as AssetLicense)}
        options={assetLicenses.map((l) => ({ value: l, label: t(`cards.image.licenses.${l}`) }))}
      />
      {license !== 'own' ? <Input label={t('cards.image.attribution')} value={attribution} maxLength={300} onChange={(e) => setAttribution(e.target.value)} /> : null}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="flex flex-col items-center gap-2 rounded-map border border-dashed border-border p-3 text-center"
      >
        <p className="text-xs text-muted">{t('cards.image.dropHint')}</p>
        <Button variant="secondary" disabled={sending} onClick={() => fileInput.current?.click()}>
          {hasImage ? t('cards.image.replace') : t('cards.image.pick')}
        </Button>
        <input
          ref={fileInput}
          type="file"
          hidden
          accept={imageMimes.join(',')}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void send(f);
          }}
        />
      </div>

      {sending ? (
        <div className="flex flex-col gap-1" role="status">
          <span className="text-xs text-muted">{t('cards.image.uploading', { pct: upload.pct })}</span>
          <Progress aria-label={t('cards.image.uploadProgress')} value={upload.pct} />
        </div>
      ) : null}
      {upload.state === 'failed' ? (
        <Alert tone="review" role="alert" title={t('cards.image.failed')}>
          <Button variant="secondary" onClick={() => void send(upload.file)}>
            {t('common.retry')}
          </Button>
        </Alert>
      ) : null}
      {upload.state === 'invalid' ? <Alert tone="review" role="alert" title={t(`cards.image.${upload.problem}`)} /> : null}
    </div>
  );
}

/** D-096: optional image on the question (front) side: add, replace or remove; the card stores `frontAssetId`. */
export function QuestionImage({ title, assetId, onChange }: { title: string; assetId: string | null; onChange: (assetId: string | null) => void }) {
  const asset = useAsset(assetId);
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-xs font-semibold text-text">{t('cards.frontImage.label')}</legend>
      {assetId ? (
        <div className="flex flex-col gap-2">
          <div className="overflow-hidden rounded-map border border-border bg-canvas">
            {asset ? <img src={asset.urls.w800} alt={t('cards.frontImage.alt', { title })} className="block w-full" /> : <div className="h-28" />}
          </div>
          <Button variant="quiet" onClick={() => onChange(null)}>
            {t('cards.frontImage.remove')}
          </Button>
        </div>
      ) : (
        <p className="m-0 text-xs text-muted">{t('cards.frontImage.hint')}</p>
      )}
      <ImageUpload hasImage={!!assetId} onAsset={onChange} />
    </fieldset>
  );
}
