import type { ReactNode } from 'react';
import { toneClasses, type Tone } from './tone';

/**
 * VerdictBox: veredito do grader. verdict = correct (steady) | partial (watch) | incorrect (review).
 * `title` é o texto do veredito; `matched`/`missing` são as listas "Acertou" / "Faltou" (rótulos vêm de fora).
 * Região `role="status"` (anunciada ao aparecer). `children` é a área de ações/avisos abaixo do feedback.
 */
export type VerdictBoxProps = {
  verdict: 'correct' | 'partial' | 'incorrect';
  title: string;
  matchedLabel: string;
  missingLabel: string;
  matched: string[];
  missing: string[];
  feedback?: string;
  children?: ReactNode;
};

const tone: Record<VerdictBoxProps['verdict'], Tone> = { correct: 'steady', partial: 'watch', incorrect: 'review' };

function Points({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[.13em]">{label}</p>
      <ul className="mt-1 list-disc pl-5 text-sm">
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

export function VerdictBox({ verdict, title, matchedLabel, missingLabel, matched, missing, feedback, children }: VerdictBoxProps) {
  return (
    <div role="status" data-verdict={verdict} className={`flex flex-col gap-3 rounded-map border border-current/15 px-4 py-3 ${toneClasses[tone[verdict]]}`}>
      <p className="font-display text-base font-bold">{title}</p>
      <Points label={matchedLabel} items={matched} />
      <Points label={missingLabel} items={missing} />
      {feedback ? <p className="text-sm">{feedback}</p> : null}
      {children}
    </div>
  );
}
