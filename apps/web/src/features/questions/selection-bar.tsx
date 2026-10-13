'use client';
import { Button } from '@remoa/ui';
import { t } from './bank-t';

export const BANK_SELECTION_MAX = 200;
/** FR-20: sticky bar; the selection lives in the page state only (while the tab is open), never in the filters. */
export function SelectionBar({ count, onClear, onCreate }: { count: number; onClear: () => void; onCreate: () => void }) {
  if (count === 0) return null;
  return (
    <section aria-label={t('questionsBank.selectionBar')} className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-panel-dark p-4 text-white shadow-card">
      <p role="status" className="font-semibold">{count === 1 ? t('questionsBank.selectedOne') : t('questionsBank.selected', { n: count })}</p>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={onClear}>{t('questionsBank.clearSelection')}</Button><Button onClick={onCreate}>{t('questionsBank.createExam')}</Button></div>
    </section>
  );
}
