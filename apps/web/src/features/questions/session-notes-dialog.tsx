'use client';
import { useState } from 'react';
import { Alert, Button, Checkbox, Dialog, Textarea } from '@remoa/ui';
import { t } from './labels';
import { emptyUserState, questionError, saveUserState, type QuestionUserState } from './api';

/** Doubt (checkbox + note) or note-only dialog for one question. Starts from the state the session already carries and closes on save. */
export function SessionNotesDialog({ questionId, kind, initial, onOpenChange, onSaved }: { questionId: string; kind: 'doubt' | 'note'; initial?: QuestionUserState; onOpenChange: (open: boolean) => void; onSaved: (state: QuestionUserState) => void }) {
  const start = initial ?? emptyUserState;
  const [doubtful, setDoubtful] = useState(kind === 'doubt' ? true : start.doubtful);
  const [annotation, setAnnotation] = useState(start.annotation);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setError(null);
    try {
      const saved = await saveUserState(questionId, kind === 'doubt' ? { doubtful, annotation } : { annotation });
      onSaved(saved); onOpenChange(false);
    } catch (e) { setError(questionError(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={onOpenChange} title={t(kind === 'doubt' ? 'questions.doubtTitle' : 'questions.notesTitle')} description={kind === 'doubt' ? t('questions.doubtDescription') : undefined} closeLabel={t('common.close')}>
      <div className="mt-4 flex flex-col gap-4">
        {kind === 'doubt' ? <Checkbox label={t('questions.doubtCheck')} checked={doubtful} onCheckedChange={v => setDoubtful(v === true)} /> : null}
        <Textarea label={t('questions.note')} placeholder={t('questions.notePlaceholder')} maxLength={10000} value={annotation} onChange={e => setAnnotation(e.target.value)} />
        {error ? <Alert tone="review" role="alert" title={error} /> : null}
        <Button loading={busy} onClick={() => void save()}>{t(kind === 'doubt' ? 'questions.doubtSave' : 'questions.notesSave')}</Button>
      </div>
    </Dialog>
  );
}
