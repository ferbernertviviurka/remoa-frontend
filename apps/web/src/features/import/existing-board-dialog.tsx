'use client';

import type { ImportTarget } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, Dialog } from '@remoa/ui';

type Props = { open: boolean; existing: { id: string; title: string } | null; onChoose: (target: ImportTarget) => void; onCancel: () => void };

/** F17 FR-11: same normalised title among own active boards → import into it (D-118 dedupe, access unchanged) or create "<nome> (2)". */
export function ExistingBoardDialog({ open, existing, onChoose, onCancel }: Props) {
  return (
    <Dialog open={open && existing != null} onOpenChange={(o) => !o && onCancel()} title={t('importExisting.title')} description={existing?.title} closeLabel={t('common.close')}>
      <div className="flex flex-col gap-3">
        <Button size="lg" onClick={() => existing && onChoose({ boardId: existing.id })}>{t('importExisting.importIntoExisting')}</Button>
        <p className="m-0 text-sm text-muted">{t('importExisting.accessWarning')}</p>
        <Button size="lg" variant="secondary" onClick={() => onChoose('new')}>{t('importExisting.createNew')}</Button>
      </div>
    </Dialog>
  );
}
