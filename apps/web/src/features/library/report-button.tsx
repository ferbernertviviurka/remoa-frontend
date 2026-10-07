'use client';

import { useState } from 'react';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button, Dialog, Textarea } from '@remoa/ui';
import { api } from '@/lib/api';

const t = withStrings({ mapLibrary: more.mapLibrary });

/** F31 FR-30: sends the card (or the seed card a copy came from, resolved by the API) to the F10 reviewer queue. */
export function ReportButton({ cardId }: { cardId: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');
  async function send() {
    setState('busy');
    const r = await api('/v1/editorial/report', { method: 'POST', body: JSON.stringify({ cardId, note }) });
    setState(r.ok ? 'sent' : 'error');
    if (r.ok) setNote('');
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setState('idle'); }} title={t('mapLibrary.reportTitle')} description={t('mapLibrary.reportLead')} closeLabel={t('mapLibrary.close')}
      trigger={<Button size="sm" variant="quiet">{t('mapLibrary.report')}</Button>}>
      {state === 'sent' ? <p role="status" className="m-0">{t('mapLibrary.reportSent')}</p> : (
        <div className="flex flex-col gap-3">
          <Textarea label={t('mapLibrary.reportNote')} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
          {state === 'error' ? <p role="alert" className="m-0 text-sm font-semibold text-review">{t('mapLibrary.reportError')}</p> : null}
          <Button disabled={!note.trim() || state === 'busy'} onClick={() => void send()}>{t('mapLibrary.reportSend')}</Button>
        </div>
      )}
    </Dialog>
  );
}
