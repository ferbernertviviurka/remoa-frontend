import type { ReactNode } from 'react';
import { focusRing, pressable } from '../button';
import { Icon } from '../icons';

/**
 * ExternalLinkButton (F19 FR-16 "Abrir no Stripe"): link que parece o Button `secondary` (46 px). Abre em nova aba com `rel="noopener noreferrer"`.
 * O texto avisa a nova aba por `newTabLabel` (só leitor de tela).
 */
export function ExternalLinkButton({ href, newTabLabel, children }: { href: string; newTabLabel: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-border-strong bg-surface px-4 text-[15px] font-bold text-ink no-underline hover:border-primary hover:bg-primary-tint ${pressable} ${focusRing}`}>
      {children}
      <span className="sr-only">{newTabLabel}</span>
      <Icon name="right" size={16} />
    </a>
  );
}

const pretty = (v: unknown) => (v === null || v === undefined ? [] : JSON.stringify(v, null, 2).split('\n'));

/**
 * JsonDiff (F19 FR-19): "Antes" e "Depois" de um registro de auditoria, só leitura (sem nenhum controle de edição).
 * Dois blocos `<pre>` com JSON indentado; a linha que não existe do outro lado ganha fundo e prefixo (− removida, + acrescentada),
 * então a diferença não depende só da cor. Blocos rolam e recebem foco por teclado. `emptyText` quando o lado é nulo.
 */
export function JsonDiff({ beforeLabel, afterLabel, before, after, emptyText }: { beforeLabel: string; afterLabel: string; before: unknown; after: unknown; emptyText: string }) {
  const b = pretty(before);
  const a = pretty(after);
  const block = (label: string, lines: string[], other: string[], mark: '−' | '+') => {
    const seen = new Set(other);
    return (
      <section aria-label={label} className="flex min-w-0 flex-col gap-2">
        <span aria-hidden="true" className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
        {lines.length === 0 ? (
          <p className="m-0 rounded-2xl bg-canvas px-3.5 py-3 text-sm text-muted">{emptyText}</p>
        ) : (
          <pre tabIndex={0} className={`m-0 max-h-64 overflow-auto rounded-2xl bg-canvas py-2 font-mono text-[12.5px] leading-[1.6] ${focusRing}`}>
            {lines.map((l, i) => {
              const changed = !seen.has(l);
              return (
                <code key={i} data-changed={changed || undefined} className={`block whitespace-pre px-3.5 ${changed ? (mark === '−' ? 'bg-review-bg text-review-text' : 'bg-chip text-primary-deep') : ''}`}>
                  <span aria-hidden="true">{changed ? mark : ' '} </span>
                  {l}
                </code>
              );
            })}
          </pre>
        )}
      </section>
    );
  };
  return (
    <div className="flex flex-col gap-[18px]">
      {block(beforeLabel, b, a, '−')}
      {block(afterLabel, a, b, '+')}
    </div>
  );
}
