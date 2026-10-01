// Tiny markdown (F02 rule: bold, italic, lists, links; no HTML). Renders React elements only, never innerHTML.
import type { ReactNode } from 'react';

const INLINE = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
const BULLET = /^\s*[-*]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;

/** Only absolute http(s) links survive; anything else (javascript:, data:, relative) renders as plain text. */
export function safeHref(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1] !== undefined) out.push(<strong key={k}>{inline(m[1], k)}</strong>);
    else if (m[2] !== undefined) out.push(<em key={k}>{inline(m[2], k)}</em>);
    else {
      const href = safeHref(m[4]!);
      out.push(
        href ? (
          <a key={k} href={href} target="_blank" rel="noopener noreferrer" className="text-primary-deep underline">
            {m[3]}
          </a>
        ) : (
          m[3]
        ),
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block = { kind: 'p' | 'ul' | 'ol'; lines: string[] };

function blocks(text: string): Block[] {
  const out: Block[] = [];
  for (const line of text.split(/\r?\n/)) {
    const b = BULLET.exec(line);
    const o = b ? null : ORDERED.exec(line);
    const kind = b ? 'ul' : o ? 'ol' : line.trim() ? 'p' : null;
    if (!kind) {
      out.push({ kind: 'p', lines: [] }); // blank line ends the block
      continue;
    }
    const content = b?.[1] ?? o?.[1] ?? line;
    const prev = out.at(-1);
    if (prev && prev.kind === kind && (kind !== 'p' || prev.lines.length)) prev.lines.push(content);
    else out.push({ kind, lines: [content] });
  }
  return out.filter((b) => b.lines.length);
}

export function Markdown({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed text-text">
      {blocks(text).map((b, i) => {
        const k = `b${i}`;
        if (b.kind === 'p') return <p key={k}>{b.lines.flatMap((l, j) => [...(j ? [<br key={`${k}-br${j}`} />] : []), ...inline(l, `${k}-${j}`)])}</p>;
        const items = b.lines.map((l, j) => <li key={`${k}-${j}`}>{inline(l, `${k}-${j}`)}</li>);
        return b.kind === 'ul' ? <ul key={k} className="list-disc pl-5">{items}</ul> : <ol key={k} className="list-decimal pl-5">{items}</ol>;
      })}
    </div>
  );
}

/** Plain text for the map card summary: markup removed, links keep their text, lines joined. */
export function stripMarkdown(text: string): string {
  return text
    .split(/\r?\n/)
    .map((l) => (BULLET.exec(l)?.[1] ?? ORDERED.exec(l)?.[1] ?? l).trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1');
}
