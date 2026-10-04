'use client';

import { useId, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { focusRing } from '../button';
import { Icon } from '../icons';
import { toneClasses } from '../tone';
import { Tag } from '../tag';

export type AnswerMode = 'write' | 'options' | 'speak';

/**
 * QuestionPanel: conteúdo do painel do desafio (dentro de CanvasPanel). Cabeçalho (eyebrow "Desafio" + progresso "3 de 12" +
 * barra + chips de modo/estado), pergunta (h2) e, enquanto `result` é nulo, o seletor Escrever/Opções/Falar, o campo do modo
 * ativo e o botão de corrigir (`canCheck` falso = desabilitado). Com `result` (VerdictBox + RatingGroup + "Discordo"…) ele
 * substitui o formulário e a pergunta continua. Controlado: o chamador guarda `mode`, `answer`, `selectedOption`.
 * A resposta canônica nunca entra aqui antes de `result` (o servidor só devolve após a correção). Texto todo por props.
 * `voice` (modo Falar): botão de gravar 68 px e o aviso de descarte do áudio. Sem `soonLabel`, a transcrição
 * fica no campo (`answer`) para conferir. Sem `onRecord`, o botão some e o campo permanece.
 */
export type QuestionPanelProps = {
  eyebrow: string;
  progressText: string;
  /** 0–1 */
  progress: number;
  progressLabel: string;
  chips?: readonly { label: string; tone: 'brand' | 'review' | 'watch' }[];
  question: string;
  modeLabel: string;
  modes: readonly { value: AnswerMode; label: string }[];
  mode: AnswerMode;
  onModeChange: (m: AnswerMode) => void;
  answerLabel: string;
  answer: string;
  onAnswerChange: (v: string) => void;
  optionsLabel: string;
  options: readonly { id: string; key: string; text: string }[];
  selectedOption: string | null;
  onSelectOption: (id: string) => void;
  /** `soonLabel`: botão desabilitado + Tag, sem campo. Sem `onRecord`, o botão some e o campo fica. */
  voice?: { recordLabel: string; soonLabel?: string; transcript?: string; note: string; onRecord?: () => void };
  checkLabel: string;
  canCheck: boolean;
  onCheck: () => void;
  result?: ReactNode;
};

export function QuestionPanel(p: QuestionPanelProps) {
  const areaId = useId();
  const voiceId = useId();
  return (
    <div className="flex h-full min-h-0 flex-col text-(--cv-ink)">
      <div className="flex flex-col gap-3 border-b border-border px-5 pb-3.5 pt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">{p.eyebrow}</span>
          <span className="text-[13px] font-bold text-muted">{p.progressText}</span>
        </div>
        <div role="progressbar" aria-label={p.progressLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.progress * 100)} className="h-1.5 overflow-hidden rounded-[3px] bg-(--cv-line-soft)">
          <div className="h-1.5 bg-primary" style={{ width: `${Math.round(p.progress * 100)}%` }} />
        </div>
        {p.chips?.length ? (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0 text-xs font-bold">
            {p.chips.map((c) => (
              <li key={c.label} className={clsx('rounded-pill px-2.5 py-1', toneClasses[c.tone])}>{c.label}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-5 py-[18px]">
        <h2 className="m-0 font-display text-[21px] font-bold leading-[1.25] tracking-[-.02em]">{p.question}</h2>
        {p.result ?? (
          <>
            <div role="group" aria-label={p.modeLabel} className="flex gap-1 rounded-[14px] bg-(--cv-seg) p-1">
              {p.modes.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={m.value === p.mode}
                  onClick={() => p.onModeChange(m.value)}
                  className={clsx('h-10 flex-1 cursor-pointer rounded-[11px] text-[13.5px] font-bold', focusRing, m.value === p.mode ? 'bg-surface text-primary-deep' : 'text-muted hover:text-(--cv-ink)')}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {p.mode === 'speak' && p.voice?.soonLabel ? (
              <div className="flex flex-col items-center gap-3 rounded-[20px] bg-canvas p-5 text-center">
                <button
                  type="button"
                  aria-label={p.voice.recordLabel}
                  aria-disabled="true"
                  aria-describedby={voiceId}
                  className={clsx('flex size-[68px] cursor-not-allowed items-center justify-center rounded-full bg-primary text-on-primary opacity-50', focusRing)}
                >
                  <Icon name="mic" size={28} />
                </button>
                <Tag tone="brand">{p.voice.soonLabel}</Tag>
                <span id={voiceId} className="text-[13px] text-muted">{p.voice.soonLabel}. {p.voice.note}</span>
              </div>
            ) : null}
            {p.mode === 'speak' && p.voice && !p.voice.soonLabel ? (
              <div className="flex flex-col items-center gap-3 text-center">
                {p.voice.onRecord ? (
                  <button
                    type="button"
                    aria-label={p.voice.recordLabel}
                    onClick={p.voice.onRecord}
                    className={clsx('flex size-[68px] cursor-pointer items-center justify-center rounded-full bg-primary text-on-primary', focusRing)}
                  >
                    <Icon name="mic" size={28} />
                  </button>
                ) : null}
                <span id={voiceId} className="text-[13px] text-muted">{p.voice.note}</span>
              </div>
            ) : null}
            {p.mode === 'write' || (p.mode === 'speak' && !p.voice?.soonLabel) ? (
              <div className="flex flex-col gap-2">
                <label htmlFor={areaId} className="text-sm font-bold">{p.answerLabel}</label>
                <textarea
                  id={areaId}
                  rows={3}
                  aria-describedby={p.mode === 'speak' && p.voice && !p.voice.soonLabel ? voiceId : undefined}
                  value={p.answer}
                  onChange={(e) => p.onAnswerChange(e.target.value)}
                  className={`box-border w-full resize-none rounded-[14px] border-[1.5px] border-(--cv-border-strong) bg-surface px-3.5 py-3 text-[15px] leading-[1.45] ${focusRing}`}
                />
              </div>
            ) : null}
            {p.mode === 'options' ? (
              <div role="group" aria-label={p.optionsLabel} className="flex flex-col gap-2">
                {p.options.map((o) => {
                  const on = o.id === p.selectedOption;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => p.onSelectOption(o.id)}
                      className={clsx('flex min-h-[50px] cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] px-3.5 py-2 text-left text-[14.5px] font-semibold', focusRing, on ? 'border-primary bg-primary-tint' : 'border-border bg-surface hover:border-primary')}
                    >
                      <span aria-hidden="true" className={clsx('flex size-[26px] shrink-0 items-center justify-center rounded-full text-xs font-bold', on ? 'bg-primary text-on-primary' : 'bg-(--cv-chip) text-muted')}>{o.key}</span>
                      {o.text}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <button
              type="button"
              disabled={!p.canCheck}
              onClick={p.onCheck}
              className={clsx('h-[50px] cursor-pointer rounded-[15px] text-[15px] font-bold', focusRing, p.canCheck ? 'bg-primary text-on-primary' : 'cursor-default bg-(--cv-border-strong) text-muted')}
            >
              {p.checkLabel}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
