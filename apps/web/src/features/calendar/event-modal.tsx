'use client';

import { useState } from 'react';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Dialog, EventForm, type CalendarLabelItem, type EventFormValue } from '@remoa/ui';
import { uploadCover } from './api';
import { text } from './text';

const t = withStrings({ calendar: more.calendar }); // P-512: namespace fora do núcleo

/** F25 FR-11: modal de 600 px de criar/editar. A capa sobe assim que escolhida (sign → PUT → complete); "Salvar" espera o envio. */
export function EventModal({ mode, initial, initialCoverId = null, labels, onSubmit, onClose }: {
  mode: 'create' | 'edit';
  initial: EventFormValue;
  initialCoverId?: string | null;
  labels: readonly CalendarLabelItem[];
  onSubmit: (value: EventFormValue, coverAssetId: string | null) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [coverId, setCoverId] = useState(initialCoverId);
  const [busy, setBusy] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  const onFile = async (file: File) => {
    setValue((v) => ({ ...v, cover: { name: file.name, url: URL.createObjectURL(file) } }));
    setBusy(true);
    setCoverFailed(false);
    const r = await uploadCover(file);
    setBusy(false);
    if (r.ok) return setCoverId(r.data.id);
    setCoverFailed(true);
    setCoverId(null);
    setValue((v) => ({ ...v, cover: null }));
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }} size="form" srOnlyHeader title={mode === 'edit' ? text.form.titleEdit : text.form.titleNew} closeLabel={text.form.close}>
      <EventForm
        mode={mode}
        value={value}
        onChange={(v) => { if (!v.cover) setCoverId(null); setValue(v); }}
        labels={labels}
        saving={busy}
        onFile={(f) => void onFile(f)}
        onCancel={onClose}
        onSubmit={() => onSubmit(value, coverId)}
        text={text.form}
      />
      {coverFailed ? <p role="alert" className="m-0 mt-3 rounded-[14px] bg-review-bg px-4 py-3 text-sm font-semibold text-review-text">{t('calendar.page.coverError')}</p> : null}
    </Dialog>
  );
}
