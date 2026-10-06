'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Alert, Button } from '@remoa/ui';
import { api } from '@/lib/api';
import { trackAi } from '@/lib/analytics';
import { isLimit, type AiMeta, type AiUsage } from './types';

const t = withStrings({ ai: more.ai });

/** Permanent warning next to every AI result. AI output is always rendered as React text (never HTML). */
export function AiWarning() {
  return <p className="m-0 text-xs text-muted" data-testid="ai-warning">{t('ai.mayErr')}</p>;
}

/** The passage the AI relied on, as plain text. */
export function AiSource({ quote, label = t('ai.source') }: { quote?: string | null; label?: string }) {
  if (!quote) return null;
  return <p className="m-0 text-xs text-muted"><strong>{label}:</strong> “{quote}”</p>;
}

/** Streaming feedback: text only, announced politely. */
export function AiStreaming({ text }: { text: string }) {
  return (
    <div role="status" aria-label={t('ai.streamingLabel')} aria-busy="true" className="flex flex-col gap-1">
      <p className="m-0 text-xs text-muted">{t('ai.loading')}</p>
      {text ? <p className="m-0 whitespace-pre-wrap text-sm">{text}</p> : null}
    </div>
  );
}

/** Fallback / error (with retry) / limit / 80% notice. Renders nothing for a plain ok result. */
export function AiNotice({ ai, usage, onRetry }: { ai?: AiMeta | null; usage?: AiUsage; onRetry?: () => void }) {
  const failed = ai?.status === 'error';
  useEffect(() => {
    if (failed) trackAi('ai_error', { type: ai?.code ?? 'unknown' });
  }, [failed, ai?.code]);
  if (isLimit(ai, usage))
    return (
      <Alert tone="watch" title={t('ai.limitTitle')}>
        <span>{t('ai.limitResets')}</span>
        <Link href="/app/planos?de=ai_quota" className="font-semibold underline">{t('ai.limitCta')}</Link>
      </Alert>
    );
  if (failed)
    return (
      <Alert tone="review" role="alert" title={ai?.message || t('ai.error')}>
        {onRetry ? <Button variant="secondary" size="sm" onClick={onRetry}>{t('ai.retry')}</Button> : null}
      </Alert>
    );
  if (ai?.status === 'fallback') return <Alert tone="unknown" title={t('ai.fallback')} />;
  if (usage?.warn80 && usage.remaining != null) return <Alert tone="watch" title={t('ai.warn80', { n: usage.remaining })} />;
  return null;
}

// TODO(CCR): use the contract type for the flag when @remoa/contracts has it.
type FlagState = 'idle' | 'busy' | 'sent' | 'error';

/** "Essa correção está errada": POST /v1/ai/grades/:id/flag. No user text goes to telemetry. */
export function FlagGradeButton({ gradeId }: { gradeId: string }) {
  const [state, setState] = useState<FlagState>('idle');
  if (state === 'sent') return <p role="status" className="m-0 text-sm font-semibold">{t('ai.flagSent')}</p>;
  async function send() {
    setState('busy');
    try {
      const r = await api(`/v1/ai/grades/${encodeURIComponent(gradeId)}/flag`, { method: 'POST', body: JSON.stringify({}) });
      if (r.ok) trackAi('ai_grade_flagged', {});
      setState(r.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="quiet" loading={state === 'busy'} onClick={() => void send()}>{t('ai.flag')}</Button>
      {state === 'error' ? <p role="alert" className="m-0 text-sm">{t('ai.flagError')}</p> : null}
    </div>
  );
}
