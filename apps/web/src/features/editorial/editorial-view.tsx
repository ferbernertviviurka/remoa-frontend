'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { t } from '@remoa/strings';
import { Button } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';

type Point = { text: string; essential: boolean };
type Item = {
  id: string; cardId: string; boardId: string; boardTitle?: string; title?: string;
  front: string | null; back: string | null; source: string | null; points: Point[]; previousPoints: Point[];
  status: string; flagSource: string | null; note: string | null;
};
type Queue = { items: Item[]; total: number; boards: { id: string; title: string }[]; reviewer: { name: string | null; crm: string | null } };
type Draft = { id: string; title: string };
type Metrics = { submitted: number; overridden: number; agreement: number | null };

export function EditorialView() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [total, setTotal] = useState(0);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [denied, setDenied] = useState(false);
  const [note, setNote] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [flag, setFlag] = useState('');
  const [board, setBoard] = useState('');
  const [boards, setBoards] = useState<{ id: string; title: string }[]>([]);
  const [crm, setCrm] = useState('');
  const [crmNote, setCrmNote] = useState(false);
  const [ownCard, setOwnCard] = useState(false);
  const crmLoaded = useRef(false);

  async function loadQueue(nextFlag = flag, nextBoard = board) {
    const params = new URLSearchParams();
    if (nextFlag) params.set('flag', nextFlag);
    if (nextBoard) params.set('board', nextBoard);
    const q = params.size ? `?${params.toString()}` : '';
    const r = await api<Queue>(`/v1/editorial/queue${q}`);
    if (!r.ok) setDenied(true);
    else {
      setItems(r.data.items);
      setTotal(r.data.total);
      setBoards(r.data.boards);
      if (!crmLoaded.current) {
        crmLoaded.current = true;
        setCrm(r.data.reviewer.crm ?? '');
      }
    }
  }

  async function dispute(reviewItemId: string, outcome: 'rubric_correct' | 'rubric_adjusted', points: Point[]) {
    const rubricPoints = points.map((p) => ({ ...p, text: p.text.trim() })).filter((p) => p.text);
    const r = await api('/v1/editorial/dispute', {
      method: 'POST',
      body: JSON.stringify({ reviewItemId, outcome, note: note || null, ...(outcome === 'rubric_adjusted' && rubricPoints.length ? { rubricPoints } : {}) }),
    });
    if (r.ok) {
      track('dispute_resolved', { outcome });
      await loadQueue();
    }
  }

  useEffect(() => {
    void loadQueue();
    void api<Draft[]>('/v1/editorial/drafts').then((r) => { if (r.ok) setDrafts(r.data); });
    void api<Metrics>('/v1/editorial/metrics').then((r) => { if (r.ok) setMetrics(r.data); });
  }, []);

  async function decide(reviewItemId: string, decision: 'approved' | 'changes_requested' | 'rejected', points: Point[]) {
    const rubricPoints = points.map((p) => ({ ...p, text: p.text.trim() })).filter((p) => p.text);
    const r = await api('/v1/editorial/decide', {
      method: 'POST',
      body: JSON.stringify({ reviewItemId, decision, note: note || null, ...(decision === 'approved' && rubricPoints.length ? { rubricPoints } : {}) }),
    });
    if (r.ok) {
      setOwnCard(false);
      if (decision === 'approved') track('card_approved', {});
      await loadQueue();
    } else if (!r.ok && r.error.code === 'forbidden') setOwnCard(true);
  }

  async function saveCrm() {
    setCrmNote(false);
    const r = await api('/v1/editorial/crm', { method: 'POST', body: JSON.stringify({ crm }) });
    if (r.ok) setCrmNote(true);
  }

  async function publish(boardId: string, title: string) {
    setBlocked(false);
    const r = await api('/v1/editorial/publish', { method: 'POST', body: JSON.stringify({ boardId, changelog: note.trim() || title, temporalMark: 'Enamed 2026.2' }) });
    if (!r.ok) setBlocked(true);
    else {
      track('version_published', {});
      setDrafts((cur) => cur.filter((d) => d.id !== boardId));
    }
  }

  if (denied) return <p className="m-0 text-muted">{t('editorial.forbidden')}</p>;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <h1 className="m-0 font-display text-3xl font-extrabold">{t('editorial.title')}</h1>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-48 flex-col gap-1 text-sm font-semibold">
          {t('editorial.crm')}
          <input value={crm} onChange={(e) => { setCrm(e.target.value); setCrmNote(false); }} className="h-11 rounded-xl border border-border bg-surface px-3" />
        </label>
        <Button size="sm" variant="secondary" onClick={() => void saveCrm()}>{t('editorial.crmSave')}</Button>
      </div>
      {crmNote ? <p className="m-0 text-sm text-muted">{t('editorial.crmSaved')}</p> : null}
      {metrics ? (
        <p className="m-0 text-sm text-muted">
          <Link href="/editorial/metricas" className="font-semibold text-primary-deep no-underline">{t('editorial.metrics')}</Link>
          {': '}
          {metrics.agreement == null ? '—' : `${Math.round(metrics.agreement * 100)}%`}
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm font-semibold">
        {t('editorial.note')}
        <input value={note} onChange={(e) => setNote(e.target.value)} className="h-11 rounded-xl border border-border bg-surface px-3" />
      </label>
      {ownCard ? <p role="alert" className="m-0 text-sm font-semibold text-review">{t('editorial.ownCard')}</p> : null}
      {blocked ? <p role="alert" className="m-0 text-sm font-semibold text-review">{t('editorial.publishBlocked')}</p> : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {drafts.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
            <span className="font-semibold">{d.title}</span>
            <Button size="sm" onClick={() => void publish(d.id, d.title)}>{t('editorial.publish')}</Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {(['', 'draft', 'ai', 'user_disagree'] as const).map((value) => (
          <Button key={value || 'all'} size="sm" variant={flag === value ? 'primary' : 'secondary'} onClick={() => { setFlag(value); void loadQueue(value, board); }}>
            {t(value === 'draft' ? 'editorial.filterDraft' : value === 'ai' ? 'editorial.filterAi' : value === 'user_disagree' ? 'editorial.filterDisagree' : 'editorial.filterAll')}
          </Button>
        ))}
      </div>
      {boards.length > 1 ? (
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t('editorial.filterMap')}
          <select value={board} onChange={(e) => { setBoard(e.target.value); void loadQueue(flag, e.target.value); }} className="h-11 rounded-xl border border-border bg-surface px-3">
            <option value="">{t('editorial.filterAll')}</option>
            {boards.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
        </label>
      ) : null}
      {total > 0 ? <p className="m-0 text-sm text-muted">{t('editorial.queueWaiting', { shown: items?.length ?? 0, total })}</p> : null}
      {items && items.length === 0 ? <p className="m-0 text-muted">{t('editorial.empty')}</p> : null}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {(items ?? []).map((item) => (
          <ReviewItem key={item.id} item={item} onDecide={decide} onDispute={dispute} />
        ))}
      </ul>
    </div>
  );
}

function ReviewItem({ item, onDecide, onDispute }: {
  item: Item;
  onDecide: (id: string, decision: 'approved' | 'changes_requested' | 'rejected', points: Point[]) => Promise<void>;
  onDispute: (id: string, outcome: 'rubric_correct' | 'rubric_adjusted', points: Point[]) => Promise<void>;
}) {
  const [points, setPoints] = useState(item.points);
  return (
    <li className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-4">
      <span className="font-semibold">{item.title ?? item.cardId}</span>
      {item.boardTitle ? <span className="text-sm text-muted">{item.boardTitle}</span> : null}
      {item.front ? <p className="m-0 text-sm">{item.front}</p> : null}
      {item.back ? <p className="m-0 text-sm text-muted">{item.back}</p> : null}
      {item.source ? <p className="m-0 text-sm text-muted">{t('editorial.source', { fonte: item.source })}</p> : null}
      {item.previousPoints.length ? (
        <div className="rounded-xl bg-canvas px-3 py-2 text-sm text-muted">
          <p className="m-0 font-semibold">{t('editorial.before')}</p>
          <ul className="m-0 list-disc pl-5">{item.previousPoints.map((p) => <li key={p.text}>{p.text}</li>)}</ul>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        {points.map((p, i) => (
          <input
            key={i}
            aria-label={t('editorial.point', { n: i + 1 })}
            value={p.text}
            onChange={(e) => setPoints((cur) => cur.map((row, j) => (j === i ? { ...row, text: e.target.value } : row)))}
            className="h-11 rounded-xl border border-border bg-canvas px-3"
          />
        ))}
      </div>
      <span className="text-sm text-muted">{item.flagSource ?? item.status}</span>
      <div className="flex flex-wrap gap-2">
        {item.flagSource === 'user_disagree' ? (
          <>
            <Button size="sm" onClick={() => void onDispute(item.id, 'rubric_correct', points)}>{t('editorial.rubricCorrect')}</Button>
            <Button size="sm" variant="secondary" onClick={() => void onDispute(item.id, 'rubric_adjusted', points)}>{t('editorial.rubricAdjust')}</Button>
          </>
        ) : (
          <>
            <Button size="sm" onClick={() => void onDecide(item.id, 'approved', points)}>{t('editorial.approve')}</Button>
            <Button size="sm" variant="secondary" onClick={() => void onDecide(item.id, 'changes_requested', points)}>{t('editorial.request')}</Button>
            <Button size="sm" variant="secondary" onClick={() => void onDecide(item.id, 'rejected', points)}>{t('editorial.reject')}</Button>
          </>
        )}
      </div>
    </li>
  );
}
