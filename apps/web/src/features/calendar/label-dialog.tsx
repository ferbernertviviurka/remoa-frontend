'use client';

import { useState } from 'react';
import { CALENDAR_LIMITS, type CalendarLabel } from '@remoa/contracts';
import { strings, t } from '@remoa/strings';
import { Button, Dialog, Input, LabelColorPicker } from '@remoa/ui';
import type { LabelOutcome } from './use-calendar';
import { colorHex, colorKey } from './model';
import { text } from './text';

/** F25 FR-9: criar, renomear, recolorir e excluir etiqueta (excluir move os compromissos para "Pessoal", depois de confirmar). */
export function LabelDialog({ label, onSave, onDelete, onClose }: {
  label: CalendarLabel | null;
  onSave: (input: { name: string; color: CalendarLabel['color'] }) => Promise<LabelOutcome>;
  onDelete: (() => Promise<LabelOutcome>) | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(label?.name ?? '');
  const [color, setColor] = useState(colorHex(label?.color ?? 'blue'));
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<'name' | 'limit' | 'error' | null>(null);
  const [confirm, setConfirm] = useState(false);
  const d = strings.calendar.labelDialog;

  const run = async (op: () => Promise<LabelOutcome>) => {
    setBusy(true);
    const r = await op();
    setBusy(false);
    if (r === 'ok') return onClose();
    setProblem(r === 'limit' ? 'limit' : 'error');
  };
  const submit = () => {
    const n = name.trim();
    if (n.length < CALENDAR_LIMITS.labelNameMin || n.length > CALENDAR_LIMITS.labelNameMax) return setProblem('name');
    void run(() => onSave({ name: n, color: colorKey(color) }));
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }} title={label ? d.titleEdit : d.titleNew} closeLabel={d.close}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate className="flex flex-col gap-4">
        <Input label={d.name} value={name} onChange={(e) => { setName(e.target.value); setProblem(null); }} aria-invalid={problem === 'name' ? true : undefined} maxLength={CALENDAR_LIMITS.labelNameMax + 10} />
        <LabelColorPicker value={color} onChange={setColor} text={text.colors} />
        {problem ? <p role="alert" className="m-0 text-[13.5px] font-semibold text-review-text">{problem === 'name' ? d.errorName : problem === 'limit' ? d.errorLimit : t('calendar.page.actionError')}</p> : null}
        {confirm ? (
          <div role="alertdialog" aria-labelledby="lbl-del-t" aria-describedby="lbl-del-b" className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-review bg-review-bg p-4">
            <span id="lbl-del-t" className="font-bold text-review-text">{d.confirmTitle}</span>
            <span id="lbl-del-b" className="text-sm text-review-text">{d.confirmBody}</span>
            <div className="flex gap-2.5">
              <Button type="button" variant="danger" size="sm" disabled={busy} onClick={() => onDelete && void run(onDelete)}>{d.confirmYes}</Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setConfirm(false)}>{d.confirmNo}</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {onDelete ? <Button type="button" variant="quiet" size="sm" onClick={() => setConfirm(true)}>{d.delete}</Button> : <span />}
            <span className="flex gap-2.5">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>{d.cancel}</Button>
              <Button type="submit" size="sm" disabled={busy}>{d.save}</Button>
            </span>
          </div>
        )}
      </form>
    </Dialog>
  );
}
