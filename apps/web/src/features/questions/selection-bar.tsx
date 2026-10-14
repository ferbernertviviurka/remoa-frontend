'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, Icon, IconButton, Morph } from '@remoa/ui';
import { t } from './bank-t';

export const BANK_SELECTION_MAX = 200;
const EXIT_MS = 200;
/** FR-20: compact floating pill (count, main action, clear); slides/fades in and out. The selection lives in the page state only. */
export function SelectionBar({ count, onClear, onCreate }: { count: number; onClear: () => void; onCreate: () => void }) {
  const [mounted, setMounted] = useState(count > 0);
  const [shown, setShown] = useState(false);
  const last = useRef(count);
  if (count > 0) last.current = count; // keeps the number while the pill fades out
  useEffect(() => {
    if (count > 0) { setMounted(true); const raf = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(raf); }
    setShown(false);
    const timer = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [count > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!mounted) return null;
  const n = last.current;
  return (
    <section aria-label={t('questionsBank.selectionBar')} data-shown={shown}
      className={`fixed bottom-4 left-1/2 z-20 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-panel-dark py-2 pl-5 pr-2 text-white shadow-card transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none [html[data-motion=reduced]_&]:transition-none ${shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
      <p role="status" className="whitespace-nowrap text-sm font-semibold"><Morph>{n === 1 ? t('questionsBank.selectedPillOne') : t('questionsBank.selectedPill', { n })}</Morph></p>
      <Button size="sm" onClick={onCreate}>{t('questionsBank.createExamShort')}</Button>
      <IconButton variant="secondary" aria-label={t('questionsBank.clearSelection')} onClick={onClear}><Icon name="close" size={18} /></IconButton>
    </section>
  );
}
