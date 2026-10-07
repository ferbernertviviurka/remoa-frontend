'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import {
  ANSWER_MAX_CHARS,
  aiAnswerResultSchema,
  aiChallengeItemPublicSchema,
  type AiAnswerInput,
  type AiAnswerResult,
  type AiChallengeItemPublic,
} from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button } from '@remoa/ui';
import { api } from '@/lib/api';
import { MaskOverlay } from '@/features/cards/mask-editor';
import { useAsset } from '@/features/cards/upload';

const t = withStrings({ challenge: more.challenge, ai: more.ai });

/** sessionStorage key where the setup flow leaves the start response (there is no GET of the session yet). */
export const SESSION_STORAGE_PREFIX = 'remoa:challenge-ai:';

export type SessionView = { id: string; total: number; position: number; current: AiChallengeItemPublic | null };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const pick = <K extends string>(o: Obj, keys: readonly K[]) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]])) as Partial<Record<K, unknown>>;
const arr = (v: unknown) => (Array.isArray(v) ? v : []);

/**
 * FR-36: copies only the public fields of each item type, so a reference that leaks into the JSON (correct_key, expected_answer,
 * referenceRef, rubric, keyPoints...) never reaches state, storage or the DOM. Anything that does not fit the public schema is dropped.
 */
export function toPublicItem(raw: unknown): AiChallengeItemPublic | null {
  if (!isObj(raw)) return null;
  const base = pick(raw, ['id', 'position', 'stem', 'type'] as const);
  let item: Obj;
  switch (raw.type) {
    case 'objective':
      item = { ...base, alternatives: arr(raw.alternatives).map((a) => (isObj(a) ? pick(a, ['key', 'text'] as const) : a)) };
      break;
    case 'edge':
      item = { ...base, ...pick(raw, ['fromTitle', 'toTitle'] as const) };
      break;
    case 'next_step':
      item = { ...base, steps: arr(raw.steps).map((s) => (isObj(s) ? pick(s, ['id', 'text'] as const) : s)) };
      break;
    case 'occlusion':
      item = {
        ...base,
        ...pick(raw, ['assetId', 'maskId'] as const),
        masks: arr(raw.masks).map((m) => (isObj(m) ? { id: m.id, polygon: arr(m.polygon).map((p) => (isObj(p) ? pick(p, ['x', 'y'] as const) : p)) } : m)),
      };
      break;
    case 'case':
      item = { ...base, ...pick(raw, ['stage', 'revealed'] as const) };
      break;
    default:
      item = base;
  }
  const r = aiChallengeItemPublicSchema.safeParse(item);
  return r.success ? r.data : null;
}

export function toAnswerResult(raw: unknown): AiAnswerResult | null {
  if (!isObj(raw)) return null;
  const keys = ['attemptId', 'attemptNo', 'verdict', 'gradedBy', 'rating', 'feedback', 'hint', 'canRetry', 'manipulation'] as const;
  const r = aiAnswerResultSchema.safeParse(pick(raw, keys));
  return r.success ? r.data : null;
}

export function toSessionView(raw: unknown): SessionView | null {
  if (!isObj(raw) || typeof raw.id !== 'string') return null;
  const n = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0);
  return { id: raw.id, total: n(raw.total), position: n(raw.position), current: toPublicItem(raw.current) };
}

const VERDICTS = ['correct', 'partial', 'incorrect'] as const;
export type SessionReport = {
  correct: number; partial: number; incorrect: number; pending: number;
  items: { itemId: string; stem: string; verdict: 'correct' | 'partial' | 'incorrect' | null; feedback: string | null }[];
};

/** The finish payload, public fields only. A planted expected answer never reaches state. */
export function toReport(raw: unknown): SessionReport | null {
  if (!isObj(raw) || !isObj(raw.score)) return null;
  const n = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0);
  const items = arr(raw.items).flatMap((item) => {
    if (!isObj(item) || typeof item.itemId !== 'string' || typeof item.stem !== 'string') return [];
    const verdict = (VERDICTS as readonly string[]).includes(String(item.verdict)) ? (item.verdict as SessionReport['items'][number]['verdict']) : null;
    return [{ itemId: item.itemId, stem: item.stem, verdict, feedback: typeof item.feedback === 'string' ? item.feedback : null }];
  });
  return { correct: n(raw.score.correct), partial: n(raw.score.partial), incorrect: n(raw.score.incorrect), pending: n(raw.score.pending), items };
}

/** Called by the setup flow with the start response; only the sanitized view is written. */
export function rememberChallengeAiSession(raw: unknown) {
  const view = toSessionView(raw);
  if (!view) return;
  try {
    sessionStorage.setItem(SESSION_STORAGE_PREFIX + view.id, JSON.stringify(view));
  } catch {
    // private mode / quota: the screen shows the load error
  }
}

function readStored(sessionId: string): SessionView | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_PREFIX + sessionId);
    return raw ? toSessionView(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

const isBank = (item: AiChallengeItemPublic) => item.type === 'discursive' || item.type === 'objective';
const textMax = (item: AiChallengeItemPublic) => (item.type === 'occlusion' ? 200 : ANSWER_MAX_CHARS);

type Send = 'idle' | 'busy' | 'sent' | 'error';
type Props = {
  sessionId: string;
  boardId: string;
  /** Start response (raw JSON); without it the screen reads what the setup flow stored for this session. */
  initial?: unknown;
};

/** F32 T7: one item of a "Desafio com IA" session, full screen. The verdict comes from the server; nothing here can set or edit it. */
export function SessionScreen({ sessionId, boardId, initial }: Props) {
  const [session, setSession] = useState<SessionView | null | undefined>(() => (initial === undefined ? undefined : toSessionView(initial)));
  const [finished, setFinished] = useState(false);
  const [report, setReport] = useState<SessionReport | null>(null);
  useEffect(() => {
    if (session === undefined) setSession(readStored(sessionId));
  }, [session, sessionId]);

  async function advance() {
    const r = await api<unknown>(`/v1/challenge-ai/sessions/${encodeURIComponent(sessionId)}`);
    const view = r.ok ? toSessionView(r.data) : null;
    if (!view || view.id !== sessionId) return;
    if (view.current) {
      setSession(view);
      return;
    }
    const fin = await api<unknown>(`/v1/challenge-ai/sessions/${encodeURIComponent(sessionId)}/finish`, { method: 'POST', body: '{}' });
    setReport(fin.ok ? toReport(fin.data) : null);
    setFinished(true);
  }

  const exit = (
    <Link href={`/app/mapas/${encodeURIComponent(boardId)}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-2 hover:underline">
      {t('quiz.exit')}
    </Link>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-surface text-ink">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col gap-5 px-4 py-5 sm:px-6">
        <header className="flex items-center justify-between gap-3">
          {exit}
          {session ? (
            <p className="m-0 text-sm text-muted">{t('challenge.progress', { n: Math.min(session.position + 1, Math.max(session.total, 1)), total: session.total })}</p>
          ) : null}
        </header>
        {session === undefined ? (
          <p role="status" className="m-0 text-sm text-muted">{t('challenge.loading')}</p>
        ) : finished ? (
          <div className="flex flex-col gap-3">
            <p role="status" className="m-0 text-sm">{t('challengeAi.done')}</p>
            {report ? (
              <>
                <p className="m-0 text-sm font-semibold">{t('challengeAi.score', { correct: report.correct, partial: report.partial, incorrect: report.incorrect, pending: report.pending })}</p>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {report.items.map((item) => (
                    <li key={item.itemId} className="flex flex-col gap-1">
                      <p className="m-0 text-sm font-semibold">{item.stem}</p>
                      <p className="m-0 text-sm">{item.verdict ? t(`challengeAi.verdict.${item.verdict}`) : t('challengeAi.verdict.pending')}</p>
                      {item.feedback ? <p className="m-0 whitespace-pre-wrap text-sm">{item.feedback}</p> : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : !session || session.id !== sessionId || !session.current ? (
          <p role="alert" className="m-0 text-sm">{t('challenge.loadError')}</p>
        ) : (
          <ItemView key={session.current.id} sessionId={sessionId} item={session.current} onAdvance={() => void advance()} />
        )}
      </div>
    </div>
  );
}

function ItemView({ sessionId, item, onAdvance }: { sessionId: string; item: AiChallengeItemPublic; onAdvance: () => void }) {
  const ids = useId();
  const started = useRef(Date.now());
  const [text, setText] = useState('');
  const [choice, setChoice] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>(() => (item.type === 'next_step' ? item.steps.map((s) => s.id) : []));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<AiAnswerResult | null>(null);
  const [dispute, setDispute] = useState<Send>('idle');
  const [report, setReport] = useState<Send>('idle');

  const locked = busy || result !== null;
  const answer: AiAnswerInput | null =
    item.type === 'objective'
      ? choice === 'A' || choice === 'B' || choice === 'C' || choice === 'D'
        ? { kind: 'choice', key: choice }
        : null
      : item.type === 'next_step'
        ? { kind: 'order', stepIds: order }
        : text.trim()
          ? item.type === 'occlusion'
            ? { kind: 'label', text: text.trim() }
            : { kind: 'text', text: text.trim() }
          : null;

  async function submit(a: AiAnswerInput) {
    setBusy(true);
    setFailed(false);
    try {
      const r = await api<unknown>(`/v1/challenge-ai/sessions/${encodeURIComponent(sessionId)}/answers`, {
        method: 'POST',
        body: JSON.stringify({ itemId: item.id, answer: a, elapsedMs: Math.max(0, Date.now() - started.current) }),
      });
      const parsed = r.ok ? toAnswerResult(r.data) : null;
      if (parsed) {
        setResult(parsed);
        setDispute('idle');
      } else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function post(path: string, body: Obj, set: (s: Send) => void) {
    set('busy');
    try {
      const r = await api<unknown>(path, { method: 'POST', body: JSON.stringify(body) });
      set(r.ok ? 'sent' : 'error');
    } catch {
      set('error');
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (answer && !locked) void submit(answer);
  }

  function retry() {
    setResult(null);
    started.current = Date.now();
  }

  function moveStep(id: string, to: number) {
    setOrder((prev) => {
      const next = prev.filter((x) => x !== id);
      next.splice(to, 0, id);
      return next;
    });
  }

  const stemId = `${ids}-stem`;
  const field = 'w-full rounded-field border border-border bg-white px-3 py-2.5 text-base text-ink focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60';

  return (
    <article className="flex flex-1 flex-col gap-5" aria-labelledby={stemId}>
      <h1 id={stemId} className="m-0 whitespace-pre-wrap font-display text-[21px] font-bold leading-snug">{item.stem}</h1>

      {item.type === 'edge' ? <p className="m-0 text-sm text-muted">{t('challenge.edgeAsk', { from: item.fromTitle, to: item.toTitle })}</p> : null}
      {item.type === 'case' && item.revealed.length > 0 ? (
        <section aria-label={t('challenge.stagesLabel')}>
          <ol className="m-0 flex list-decimal flex-col gap-2 pl-5 text-sm">
            {item.revealed.map((r, i) => <li key={i} className="whitespace-pre-wrap">{r}</li>)}
          </ol>
        </section>
      ) : null}
      {item.type === 'occlusion' ? <OcclusionImage assetId={item.assetId} maskId={item.maskId} masks={item.masks} /> : null}

      {isBank(item) ? (
        <div className="flex flex-col gap-1 rounded-field border border-border px-3 py-2 text-sm text-muted">
          <p className="m-0">{t('challengeAi.generatedLabel')}</p>
          <p className="m-0">{t('challengeAi.aiCanErr')}</p>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-4" aria-describedby={stemId}>
        {item.type === 'objective' ? (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" disabled={locked}>
            <legend className="mb-2 text-sm font-semibold">{t('challenge.optionsLabel')}</legend>
            {item.alternatives.map((a) => (
              <label key={a.key} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-field border border-border px-3 py-2.5 has-[:checked]:border-primary">
                <input type="radio" name={`${ids}-alt`} value={a.key} checked={choice === a.key} onChange={() => setChoice(a.key)} className="mt-1 h-4 w-4" />
                <span className="font-bold">{a.key}</span>
                <span className="whitespace-pre-wrap">{a.text}</span>
              </label>
            ))}
          </fieldset>
        ) : item.type === 'next_step' ? (
          <fieldset className="m-0 border-0 p-0" disabled={locked}>
            <legend className="mb-2 text-sm font-semibold">{t('challenge.answerMode')}</legend>
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {order.map((id, i) => {
                const step = item.steps.find((s) => s.id === id);
                if (!step) return null;
                return (
                  <li key={id} className="flex min-h-11 items-center gap-3 rounded-field border border-border px-3 py-2">
                    <select
                      aria-label={step.text}
                      value={i}
                      onChange={(e) => moveStep(id, Number(e.target.value))}
                      className="min-h-11 rounded-field border border-border bg-white px-2 text-base"
                    >
                      {order.map((_, p) => <option key={p} value={p}>{p + 1}</option>)}
                    </select>
                    <span className="whitespace-pre-wrap">{step.text}</span>
                  </li>
                );
              })}
            </ol>
          </fieldset>
        ) : item.type === 'occlusion' ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${ids}-text`} className="text-sm font-semibold">{t('challenge.textLabel')}</label>
            <input id={`${ids}-text`} type="text" value={text} maxLength={textMax(item)} disabled={locked} onChange={(e) => setText(e.target.value)} className={field} autoComplete="off" />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${ids}-text`} className="text-sm font-semibold">{t('challenge.textLabel')}</label>
            <textarea id={`${ids}-text`} rows={5} value={text} maxLength={textMax(item)} disabled={locked} onChange={(e) => setText(e.target.value)} className={`${field} resize-y`} />
          </div>
        )}

        {result === null ? (
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={!answer || busy} loading={busy} loadingLabel={t('challenge.grading')}>
              {item.type === 'objective' ? t('challenge.submitOption') : t('challenge.submitText')}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => void submit({ kind: 'dont_know' })}>{t('challengeAi.dontKnow')}</Button>
          </div>
        ) : null}
        {failed ? <p role="alert" className="m-0 text-sm">{t('challenge.answerError')}</p> : null}
      </form>

      <div aria-live="polite" role="status" className="flex flex-col gap-2">
        {result ? (
          <>
            <p className="m-0 text-lg font-bold" data-verdict={result.verdict ?? 'pending'}>
              {result.verdict ? t(`challengeAi.verdict.${result.verdict}`) : t('challengeAi.verdict.pending')}
            </p>
            {result.feedback ? <p className="m-0 whitespace-pre-wrap text-sm">{result.feedback}</p> : null}
            {result.hint ? <p className="m-0 whitespace-pre-wrap text-sm text-muted">{result.hint}</p> : null}
          </>
        ) : null}
      </div>

      {result ? (
        <div className="flex flex-wrap items-start gap-3">
          {result.canRetry ? <Button variant="secondary" onClick={retry}>{t('common.retry')}</Button> : <Button onClick={onAdvance}>{t('challengeAi.next')}</Button>}
          {result.verdict !== null && dispute !== 'sent' ? (
            <Button
              variant="quiet"
              loading={dispute === 'busy'}
              onClick={() => void post(`/v1/challenge-ai/attempts/${encodeURIComponent(result.attemptId)}/dispute`, { attemptId: result.attemptId }, setDispute)}
            >
              {t('challengeAi.disagree')}
            </Button>
          ) : null}
          {dispute === 'sent' ? <p role="status" className="m-0 text-sm font-semibold">{t('challenge.disputed')}</p> : null}
          {dispute === 'error' ? <p role="alert" className="m-0 text-sm">{t('challenge.disputeError')}</p> : null}
        </div>
      ) : null}

      {isBank(item) ? (
        <div className="mt-auto flex flex-col items-start gap-1 pt-2">
          {report === 'sent' ? (
            <p role="status" className="m-0 text-sm font-semibold">{t('ai.flagSent')}</p>
          ) : (
            <Button variant="quiet" loading={report === 'busy'} onClick={() => void post(`/v1/challenge-ai/items/${encodeURIComponent(item.id)}/report`, {}, setReport)}>
              {t('challengeAi.report')}
            </Button>
          )}
          {report === 'error' ? <p role="alert" className="m-0 text-sm">{t('ai.flagError')}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

function OcclusionImage({ assetId, maskId, masks }: { assetId: string; maskId: string; masks: { id: string; polygon: { x: number; y: number }[] }[] }) {
  const asset = useAsset(assetId);
  return (
    <div className="relative overflow-hidden rounded-map border border-border bg-canvas">
      {asset ? <img src={asset.urls.w800} alt={t('challenge.imageAlt')} className="block w-full" /> : <p role="status" className="m-0 p-6 text-sm text-muted">{t('common.loading')}</p>}
      {asset ? <MaskOverlay masks={masks.map((m) => ({ ...m, label: '' }))} selected={maskId} /> : null}
    </div>
  );
}
