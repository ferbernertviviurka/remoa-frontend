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
import { Button, Icon, RingProgress, Stat, Tag, VerdictBox, buttonVariants, focusRing } from '@remoa/ui';
import { api } from '@/lib/api';
import { aiChallengeHref, readStoredGenerationNotice, type GenerationNotice } from './start-ai';
import { MaskOverlay } from '@/features/cards/mask-editor';
import { useAsset } from '@/features/cards/upload';

const t = withStrings({ challenge: more.challenge, ai: more.ai });

/** sessionStorage key where the setup flow leaves the start response (there is no GET of the session yet). */
export const SESSION_STORAGE_PREFIX = 'remoa:challenge-ai:';

export type SessionView = { id: string; total: number; position: number; startedAt: number | null; timerSec: number | null; current: AiChallengeItemPublic | null };

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
  const started = typeof raw.startedAt === 'number' ? raw.startedAt : typeof raw.startedAt === 'string' ? Date.parse(raw.startedAt) : NaN;
  const timer = typeof raw.timerSec === 'number' && Number.isInteger(raw.timerSec) && raw.timerSec >= 30 && raw.timerSec <= 3 * 60 * 60 ? raw.timerSec : null;
  return { id: raw.id, total: n(raw.total), position: n(raw.position), startedAt: Number.isFinite(started) ? started : null, timerSec: timer, current: toPublicItem(raw.current) };
}

const VERDICTS = ['correct', 'partial', 'incorrect'] as const;
type Verdict = (typeof VERDICTS)[number];
const str = (v: unknown) => (typeof v === 'string' ? v : null);
const ms = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : null);
export type SessionReport = {
  correct: number; partial: number; incorrect: number; pending: number;
  percent: number;
  totalMs: number | null;
  avgMs: number | null;
  items: { itemId: string; stem: string; verdict: Verdict | null; feedback: string | null; elapsedMs: number | null }[];
  groups: { kind: 'module' | 'topic'; label: string; correct: number; partial: number; incorrect: number }[];
  advice: {
    message: string | null;
    cards: { cardId: string; title: string; reason: string | null }[];
    maps: { boardId: string; title: string; ready: boolean; reason: string | null }[];
  } | null;
};

/** The finish payload, public fields only. A planted expected answer never reaches state. */
export function toReport(raw: unknown): SessionReport | null {
  if (!isObj(raw) || !isObj(raw.score)) return null;
  const n = (v: unknown) => ms(v) ?? 0;
  const groups = arr(raw.groups).flatMap((g) => {
    if (!isObj(g) || typeof g.label !== 'string' || !g.label) return [];
    if (g.kind !== 'module' && g.kind !== 'topic') return [];
    const kind = g.kind === 'module' ? 'module' as const : 'topic' as const;
    return [{ kind, label: g.label, correct: n(g.correct), partial: n(g.partial), incorrect: n(g.incorrect) }];
  });
  const items = arr(raw.items).flatMap((item) => {
    if (!isObj(item) || typeof item.itemId !== 'string' || typeof item.stem !== 'string') return [];
    const verdict = (VERDICTS as readonly string[]).includes(String(item.verdict)) ? (item.verdict as Verdict) : null;
    return [{ itemId: item.itemId, stem: item.stem, verdict, feedback: str(item.feedback), elapsedMs: ms(item.elapsedMs) }];
  });
  const timing = isObj(raw.timing) ? raw.timing : {};
  const a = isObj(raw.advice) ? raw.advice : null;
  const advice = a && {
    message: str(a.message),
    cards: arr(a.cards).flatMap((c) => (isObj(c) && typeof c.cardId === 'string' && typeof c.title === 'string' ? [{ cardId: c.cardId, title: c.title, reason: str(c.reason) }] : [])),
    maps: arr(a.maps).flatMap((m) => (isObj(m) && typeof m.boardId === 'string' && typeof m.title === 'string' ? [{ boardId: m.boardId, title: m.title, ready: m.ready === true, reason: str(m.reason) }] : [])),
  };
  return {
    correct: n(raw.score.correct), partial: n(raw.score.partial), incorrect: n(raw.score.incorrect), pending: n(raw.score.pending),
    percent: Math.min(100, n(raw.percent)),
    totalMs: ms(timing.totalMs),
    avgMs: ms(timing.avgMs),
    items,
    groups,
    advice: advice && (advice.message || advice.cards.length || advice.maps.length) ? advice : null,
  };
}

/** "42 s" / "3 min 05 s" for the result; the live clock uses mm:ss. */
export function formatDuration(value: number | null): string {
  if (value === null) return t('challengeAi.duration.none');
  const total = Math.round(value / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? t('challengeAi.duration.min', { m, s: String(s).padStart(2, '0') }) : t('challengeAi.duration.sec', { s });
}

const clock = (value: number) => {
  const total = Math.max(0, Math.floor(value / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/** Counts down from `from + seconds`. Calls `onEnd` once at zero. Not a live region: it would talk every second. */
function Countdown({ from, seconds, label, onEnd }: { from: number; seconds: number; label: string; onEnd: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, from + seconds * 1000 - now);
  const ended = useRef(false);
  useEffect(() => {
    if (left === 0) {
      if (!ended.current) {
        ended.current = true;
        onEnd();
      }
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [left, onEnd]);
  return (
    <p className="m-0 flex items-center gap-1.5 text-sm text-muted">
      <Icon name="clock" size={15} />
      <span>{label}</span>
      <span className="font-semibold tabular-nums text-ink">{clock(left)}</span>
    </p>
  );
}

/** Ticks once a second while running; `stoppedMs` freezes it (the answer was sent). Not a live region: it would talk every second. */
function Clock({ from, stoppedMs, label }: { from: number; stoppedMs?: number | null; label: string }) {
  const [now, setNow] = useState(() => Date.now());
  const running = stoppedMs === undefined || stoppedMs === null;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  return (
    <p className="m-0 flex items-center gap-1.5 text-sm text-muted">
      <Icon name="clock" size={15} />
      <span>{label}</span>
      <span className="font-semibold tabular-nums text-ink">{clock(running ? now - from : stoppedMs)}</span>
    </p>
  );
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
  const [timeUp, setTimeUp] = useState(false);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [notice] = useState<GenerationNotice | null>(() => readStoredGenerationNotice(sessionId));
  useEffect(() => {
    if (session === undefined) setSession(readStored(sessionId));
  }, [session, sessionId]);

  const sessionUrl = `/v1/challenge-ai/sessions/${encodeURIComponent(sessionId)}`;
  // The next question is requested as soon as this one is graded for good, so "Próxima" usually opens it at once.
  const fetchView = () => api<unknown>(sessionUrl).then((r) => (r.ok ? toSessionView(r.data) : null), () => null);
  const ahead = useRef<Promise<SessionView | null> | null>(null);
  const prefetch = () => {
    ahead.current ??= fetchView();
  };

  async function advance() {
    const pending = ahead.current;
    ahead.current = null;
    const pre = pending ? await pending : null;
    // stale when the server had not moved on yet: still the question on screen
    const view = pre && pre.id === sessionId && pre.current?.id !== session?.current?.id ? pre : await fetchView();
    if (!view || view.id !== sessionId) return;
    if (view.current) {
      setSession((prev) => ({ ...view, startedAt: view.startedAt ?? prev?.startedAt ?? null }));
      return;
    }
    const fin = await api<unknown>(`${sessionUrl}/finish`, { method: 'POST', body: '{}' });
    setReport(fin.ok ? toReport(fin.data) : null);
    setFinished(true);
  }

  const mapHref = `/app/mapas/${encodeURIComponent(boardId)}`;
  const exit = (
    <Link href={mapHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-2 hover:underline">
      {t('quiz.exit')}
    </Link>
  );

  return (
    <div data-challenge-session="" className="fixed inset-0 z-50 overflow-y-auto bg-surface text-ink">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col gap-5 px-4 py-5 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {exit}
          {session && !finished ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {session.startedAt !== null && session.timerSec !== null ? (
                <Countdown from={session.startedAt} seconds={session.timerSec} label={t('challengeAi.timer.remaining')} onEnd={() => setTimeUp(true)} />
              ) : session.startedAt !== null ? (
                <Clock from={session.startedAt} label={t('challengeAi.timer.total')} />
              ) : null}
              <p className="m-0 text-sm text-muted">{t('challenge.progress', { n: Math.min(session.position + 1, Math.max(session.total, 1)), total: session.total })}</p>
            </div>
          ) : null}
        </header>
        {notice && !finished ? (
          <p className="m-0 text-sm font-semibold">
            {t(notice.stoppedBy === 'quota' ? 'challengeAi.shortfallQuota' : notice.stoppedBy === 'ai_error' ? 'challengeAi.shortfallError' : 'challengeAi.shortfall', { got: notice.requested - notice.shortfall, asked: notice.requested })}
          </p>
        ) : null}
        {session === undefined ? (
          <p role="status" className="m-0 text-sm text-muted">{t('challenge.loading')}</p>
        ) : finished ? (
          report ? <ResultView report={report} boardId={boardId} mapHref={mapHref} sessionId={sessionId} /> : <p role="status" className="m-0 text-sm">{t('challengeAi.done')}</p>
        ) : !session || session.id !== sessionId || !session.current ? (
          <p role="alert" className="m-0 text-sm">{t('challenge.loadError')}</p>
        ) : timeUp ? (
          <p role="status" className="m-0 text-sm font-semibold">{t('challengeAi.timer.up')}</p>
        ) : (
          <ItemView
            key={session.current.id}
            sessionId={sessionId}
            item={session.current}
            last={session.position + 1 >= session.total}
            onGraded={prefetch}
            onAdvance={advance}
          />
        )}
      </div>
    </div>
  );
}

type ItemProps = { sessionId: string; item: AiChallengeItemPublic; last: boolean; onGraded: () => void; onAdvance: () => Promise<void> };

function ItemView({ sessionId, item, last, onGraded, onAdvance }: ItemProps) {
  // D-1566: the next question may still be generating on the server
  const [advancing, setAdvancing] = useState(false);
  const ids = useId();
  const [started, setStarted] = useState(() => Date.now());
  const [answeredMs, setAnsweredMs] = useState<number | null>(null);
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
    const elapsedMs = Math.max(0, Date.now() - started);
    try {
      const r = await api<unknown>(`/v1/challenge-ai/sessions/${encodeURIComponent(sessionId)}/answers`, {
        method: 'POST',
        body: JSON.stringify({ itemId: item.id, answer: a, elapsedMs }),
      });
      const parsed = r.ok ? toAnswerResult(r.data) : null;
      if (parsed) {
        setResult(parsed);
        setAnsweredMs(elapsedMs);
        setDispute('idle');
        if (!parsed.canRetry) onGraded();
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
    setAnsweredMs(null);
    setStarted(Date.now());
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
      <Clock key={started} from={started} stoppedMs={answeredMs} label={t('challengeAi.timer.question')} />
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
        {result?.verdict ? (
          <VerdictBox verdict={result.verdict} label={t(`challengeAi.verdict.${result.verdict}`)} headline={t(`challengeAi.headline.${result.verdict}`)}>
            {result.feedback ? <p className="m-0 whitespace-pre-wrap text-sm">{result.feedback}</p> : null}
            {result.hint ? <p className="m-0 whitespace-pre-wrap text-sm text-muted">{result.hint}</p> : null}
          </VerdictBox>
        ) : result ? (
          <>
            <p className="m-0 text-lg font-bold" data-verdict="pending">{t('challengeAi.verdict.pending')}</p>
            {result.feedback ? <p className="m-0 whitespace-pre-wrap text-sm">{result.feedback}</p> : null}
            {result.hint ? <p className="m-0 whitespace-pre-wrap text-sm text-muted">{result.hint}</p> : null}
          </>
        ) : null}
      </div>

      {result ? (
        <div className="flex flex-wrap items-start gap-3">
          {result.canRetry ? (
            <Button variant="secondary" onClick={retry}>{t('common.retry')}</Button>
          ) : (
            <Button loading={advancing} loadingLabel={last ? t('challengeAi.finishing') : undefined} onClick={() => { setAdvancing(true); void onAdvance().finally(() => setAdvancing(false)); }}>
              {last ? t('challengeAi.finish') : t('challengeAi.next')}
            </Button>
          )}
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

const VERDICT_TONE = { correct: 'steady', partial: 'watch', incorrect: 'review' } as const;
const rowLink = `flex min-h-11 items-center gap-3 rounded-field border border-border bg-surface px-3 py-2.5 no-underline text-ink hover:border-primary ${focusRing}`;

/** D-1567: the saved result. The verdicts, times and advice come from the server (finish); nothing here recomputes a grade. */
function ResultView({ report, boardId, mapHref, sessionId }: { report: SessionReport; boardId: string; mapHref: string; sessionId: string }) {
  const ids = useId();
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), []);
  const [retry, setRetry] = useState<Send>('idle');
  const [review, setReview] = useState<Send>('idle');
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const missed = report.incorrect + report.partial > 0;
  async function redo() {
    setRetry('busy');
    const r = await api<unknown>(`/v1/challenge-ai/sessions/${encodeURIComponent(sessionId)}/retry`, { method: 'POST', body: '{}' });
    const view = r.ok ? toSessionView(r.data) : null;
    if (!view?.current) {
      setRetry('error');
      return;
    }
    rememberChallengeAiSession(r.ok ? r.data : null);
    window.location.assign(aiChallengeHref(boardId, view.id));
  }
  async function addReview() {
    setReview('busy');
    const r = await api<{ cards: number }>(`/v1/challenge-ai/sessions/${encodeURIComponent(sessionId)}/review`, { method: 'POST', body: '{}' });
    if (!r.ok || typeof r.data.cards !== 'number') {
      setReview('error');
      return;
    }
    setReviewCount(r.data.cards);
    setReview('sent');
  }
  const low = report.percent < 70;
  const counts = [
    ['correct', report.correct],
    ['partial', report.partial],
    ['incorrect', report.incorrect],
    ...(report.pending > 0 ? [['pending', report.pending] as const] : []),
  ] as const;
  return (
    <section aria-labelledby={`${ids}-t`} className="flex flex-col gap-5">
      <h1 id={`${ids}-t`} ref={title} tabIndex={-1} className="m-0 font-display text-[24px] font-extrabold tracking-tight outline-none">{t('challengeAi.result.title')}</h1>

      <div className="grid overflow-hidden rounded-[28px] border border-border bg-surface shadow-card sm:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex items-center justify-center bg-panel-dark px-6 py-6 text-on-dark">
          <RingProgress value={report.percent} max={100} size={176} label={t('challengeAi.result.ring', { percent: report.percent })}>
            <span className="font-display text-[44px] font-extrabold leading-none tracking-[-.04em] tabular-nums">{report.percent}%</span>
            <span className="mt-1 text-xs text-on-dark-muted">{t('challengeAi.result.of')}</span>
          </RingProgress>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <p className="m-0 font-bold">{low ? t('challengeAi.result.low') : t('challengeAi.result.good')}</p>
          <div className={`grid gap-2 ${counts.length > 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
            {counts.map(([key, value]) => <Stat key={key} label={t(`challengeAi.result.${key}`)} value={String(value)} />)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t('challengeAi.result.totalTime')} value={formatDuration(report.totalMs)} />
            <Stat label={t('challengeAi.result.avgTime')} value={formatDuration(report.avgMs)} />
          </div>
        </div>
      </div>

      {report.advice ? (
        <section aria-labelledby={`${ids}-a`} className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-primary/30 bg-primary-tint p-4">
          <h2 id={`${ids}-a`} className="m-0 flex items-center gap-2 text-base font-extrabold"><Icon name="sparkle" size={18} />{t('challengeAi.result.adviceTitle')}</h2>
          {report.advice.message ? <p className="m-0 whitespace-pre-wrap text-sm">{report.advice.message}</p> : null}
          {report.advice.cards.length ? (
            <div className="flex flex-col gap-2">
              <h3 className="m-0 text-sm font-bold">{t('challengeAi.result.adviceCards')}</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {report.advice.cards.map((c) => (
                  <li key={c.cardId}>
                    <Link href={`/app/mapas/${encodeURIComponent(boardId)}?card=${encodeURIComponent(c.cardId)}`} className={rowLink}>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-semibold">{c.title}</span>
                        {c.reason ? <span className="text-sm text-muted">{c.reason}</span> : null}
                      </span>
                      <Icon name="chevronRight" size={18} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {report.advice.maps.length ? (
            <div className="flex flex-col gap-2">
              <h3 className="m-0 text-sm font-bold">{t('challengeAi.result.adviceMaps')}</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {report.advice.maps.map((m) => (
                  <li key={m.boardId}>
                    <Link href={m.ready ? `/app/mapas/prontos/${encodeURIComponent(m.boardId)}` : `/app/mapas/${encodeURIComponent(m.boardId)}`} className={rowLink}>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex flex-wrap items-center gap-2 font-semibold">{m.title}{m.ready ? <Tag tone="brand">{t('challengeAi.result.readyMap')}</Tag> : null}</span>
                        {m.reason ? <span className="text-sm text-muted">{m.reason}</span> : null}
                      </span>
                      <Icon name="chevronRight" size={18} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {report.advice.message || report.advice.cards.some((c) => c.reason) || report.advice.maps.some((m) => m.reason) ? (
            <p className="m-0 text-xs text-muted">{t('challengeAi.result.adviceAi')}</p>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby={`${ids}-q`} className="flex flex-col gap-2">
        <h2 id={`${ids}-q`} className="m-0 text-base font-extrabold">{t('challengeAi.result.perQuestion')}</h2>
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {report.items.map((item, i) => (
            <li key={item.itemId} className="flex flex-col gap-1.5 rounded-field border border-border px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold">{t('challengeAi.result.question', { n: i + 1 })}</span>
                <Tag tone={item.verdict ? VERDICT_TONE[item.verdict] : 'unknown'}>{item.verdict ? t(`challengeAi.verdict.${item.verdict}`) : t('challengeAi.verdict.pending')}</Tag>
                <span className="ml-auto flex items-center gap-1 tabular-nums text-muted"><Icon name="clock" size={14} />{formatDuration(item.elapsedMs)}</span>
              </div>
              <p className="m-0 line-clamp-3 whitespace-pre-wrap text-sm font-semibold">{item.stem}</p>
              {item.feedback ? <p className="m-0 whitespace-pre-wrap text-sm text-muted">{item.feedback}</p> : null}
            </li>
          ))}
        </ol>
      </section>

      {report.groups.length ? (
        <section aria-labelledby={`${ids}-g`} className="flex flex-col gap-2">
          <h2 id={`${ids}-g`} className="m-0 text-base font-extrabold">{t('challengeAi.result.groups')}</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {report.groups.map((g) => (
              <li key={`${g.kind}:${g.label}`} className="flex flex-wrap items-center gap-2 text-sm">
                <Tag tone="unknown">{t(g.kind === 'module' ? 'challengeAi.result.groupModule' : 'challengeAi.result.groupTopic')}</Tag>
                <span>{t('challengeAi.result.groupLine', { label: g.label, correct: g.correct, partial: g.partial, incorrect: g.incorrect })}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {missed ? (
        <div className="flex flex-wrap gap-2">
          <Button loading={retry === 'busy'} onClick={() => void redo()}>{t('challengeAi.result.retryMissed')}</Button>
          <Button variant="secondary" loading={review === 'busy'} onClick={() => void addReview()}>{t('challengeAi.result.addToReview')}</Button>
        </div>
      ) : null}
      {retry === 'error' ? <p role="alert" className="m-0 text-sm">{t('challengeAi.result.retryError')}</p> : null}
      {review === 'error' ? <p role="alert" className="m-0 text-sm">{t('challengeAi.result.reviewError')}</p> : null}
      {reviewCount !== null ? <p role="status" className="m-0 text-sm">{t('challengeAi.result.addedToReview', { n: reviewCount })}</p> : null}

      <Link href={mapHref} className={`inline-flex min-h-11 items-center justify-center self-start rounded-btn px-5 no-underline ${buttonVariants.primary} ${focusRing}`}>
        {t('challengeAi.result.backToMap')}
      </Link>
    </section>
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
