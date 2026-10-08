'use client';

import { useEffect, useState } from 'react';
import { withStrings } from '@remoa/strings';
import { Button, Textarea } from '@remoa/ui';
import { api } from '@/lib/api';

const t = withStrings({});

type Status = 'auto' | 'edited' | 'approved';
type Rubric = { essentialPoints: string[]; acceptedVariants: string[]; criticalErrors: string[]; status: Status };

const lines = (value: string, max: number) => value.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, max);

/** Keeps only the three lists. A stray answer field from the server is dropped. */
function readRubric(data: unknown): Rubric | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const list = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim()).slice(0, max) : []);
  const essentialPoints = list(o.essentialPoints, 12);
  if (!essentialPoints.length) return null;
  const status: Status = o.status === 'edited' || o.status === 'approved' ? o.status : 'auto';
  return { essentialPoints, acceptedVariants: list(o.acceptedVariants, 20), criticalErrors: list(o.criticalErrors, 12), status };
}

const explain = (message: string | undefined) => {
  if (message === 'ungrounded_number') return t('challengeAi.rubric.numbers');
  if (message === 'rubric_approved') return t('challengeAi.rubric.approved');
  if (message === 'rubric_empty') return t('challengeAi.rubric.empty');
  return t('challengeAi.rubric.error');
};

/** FR-26: the owner edits the automatic rubric used to grade this card. An approved rubric stays read-only. */
export function CardRubricEditor({ cardId }: { cardId: string }) {
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [essential, setEssential] = useState('');
  const [variants, setVariants] = useState('');
  const [critical, setCritical] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setRubric(null);
    setNote(null);
    setFailed(null);
    void api<unknown>(`/v1/challenge-ai/cards/${cardId}/rubric`).then((r) => {
      if (!live) return;
      const parsed = r.ok ? readRubric(r.data) : null;
      if (!parsed) {
        setFailed(explain(r.ok ? 'rubric_empty' : r.error.message));
        return;
      }
      setRubric(parsed);
      setEssential(parsed.essentialPoints.join('\n'));
      setVariants(parsed.acceptedVariants.join('\n'));
      setCritical(parsed.criticalErrors.join('\n'));
    }).catch(() => { if (live) setFailed(t('challengeAi.rubric.error')); });
    return () => { live = false; };
  }, [cardId]);

  const locked = rubric?.status === 'approved';

  const save = async () => {
    const essentialPoints = lines(essential, 12);
    if (!essentialPoints.length) {
      setFailed(t('challengeAi.rubric.empty'));
      setNote(null);
      return;
    }
    setBusy(true);
    setFailed(null);
    setNote(null);
    try {
      const r = await api<unknown>(`/v1/challenge-ai/cards/${cardId}/rubric`, {
        method: 'POST',
        body: JSON.stringify({ essentialPoints, acceptedVariants: lines(variants, 20), criticalErrors: lines(critical, 12) }),
      });
      const parsed = r.ok ? readRubric(r.data) : null;
      if (!r.ok || !parsed) {
        setFailed(explain(r.ok ? undefined : r.error.message));
        return;
      }
      setRubric(parsed);
      setNote(t('challengeAi.rubric.saved'));
    } catch {
      setFailed(t('challengeAi.rubric.error'));
    } finally {
      setBusy(false);
    }
  };

  if (!rubric && !failed) return <p className="m-0 text-sm text-muted">{t('common.loading')}</p>;

  return (
    <section className="flex flex-col gap-3" aria-label={t('challengeAi.rubric.title')}>
      <h3 className="m-0 text-sm font-bold">{t('challengeAi.rubric.title')}</h3>
      <p className="m-0 text-sm text-muted">{t('challengeAi.rubric.hint')}</p>
      {rubric ? <p className="m-0 text-sm font-semibold">{t(rubric.status === 'edited' ? 'challengeAi.rubric.statusEdited' : rubric.status === 'approved' ? 'challengeAi.rubric.approved' : 'challengeAi.rubric.statusAuto')}</p> : null}
      <Textarea label={t('challengeAi.rubric.essential')} rows={4} value={essential} disabled={locked || busy} onChange={(e) => setEssential(e.target.value)} />
      <Textarea label={t('challengeAi.rubric.variants')} rows={3} value={variants} disabled={locked || busy} onChange={(e) => setVariants(e.target.value)} />
      <Textarea label={t('challengeAi.rubric.critical')} rows={3} value={critical} disabled={locked || busy} onChange={(e) => setCritical(e.target.value)} />
      <p className="m-0 text-xs text-muted">{t('challengeAi.rubric.lineHint')}</p>
      {locked ? null : <Button variant="secondary" size="sm" loading={busy} disabled={busy} onClick={() => void save()}>{t('challengeAi.rubric.save')}</Button>}
      {note ? <p role="status" className="m-0 text-sm font-semibold">{note}</p> : null}
      {failed ? <p role="alert" className="m-0 text-sm font-semibold text-review">{failed}</p> : null}
    </section>
  );
}
