'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { t } from '@remoa/strings';
import { Button, Icon, ReasonDialog } from '@remoa/ui';
import { exportAdminCsv } from '../shared/actions';
import { downloadCsv } from './download';

/** "Exportar CSV" button + reason dialog: sends the filters in the URL (`keys`) to POST /v1/admin/export (FR-21). */
export function ExportCsv({ resource, keys, file }: { resource: 'users' | 'maps' | 'referrals'; keys: readonly string[]; file: string }) {
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Icon name="download" size={18} />
        {t('admin.lists.exportCsv')}
      </Button>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title={t('admin.lists.exportReason')}
        summary={t('admin.lists.exportSummary')}
        reasonLabel={t('admin.reason.label')}
        tooShortText={t('admin.lists.reasonTooShort')}
        errorText={t('admin.lists.reasonError')}
        confirmLabel={t('admin.lists.exportConfirm')}
        cancelLabel={t('admin.lists.reasonCancel')}
        doneLabel={t('admin.lists.reasonDone')}
        receiptText={(id) => t('admin.lists.receipt', { id })}
        onConfirm={async (reason) => {
          const filters = Object.fromEntries(keys.flatMap((k) => (sp.get(k) ? [[k, sp.get(k)!]] : [])));
          const r = await exportAdminCsv({ reason, resource, filters });
          if (!r.ok) throw new Error(r.error.code);
          downloadCsv(r.data.csv, file);
          return { auditId: r.auditId };
        }}
      />
    </>
  );
}
