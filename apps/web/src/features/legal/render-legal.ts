// F27 FR-42/43 (D-951): minimal server-side renderer for content/legal/*.md. Subset: <!-- comments -->, # ## ###, paragraphs, - lists,
// **bold**, _italic_, [links](url). Every piece of text is escaped; an empty `{{var}}` or `[CONFIRMAR]` becomes <mark class="rb-pending">
// outside production (in production the deploy check, scripts/legal-check.mjs, has already failed the build).
import type { LegalSection } from '@remoa/ui';

export type RenderOptions = { vars: Record<string, string>; production: boolean };
export type LegalDoc = { title: string; lead: string; sections: LegalSection[]; pending: boolean };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const SAFE_URL = /^(https?:\/\/|mailto:|\/|#)/i;
const TOKEN = /(\{\{\w+\}\}|\[CONFIRMAR\])/;
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function inline(text: string, o: RenderOptions, flag: { pending: boolean }): string {
  const held: string[] = []; // already-safe HTML, restored after escaping so it is not escaped twice
  const hold = (html: string) => `\u0001${held.push(html) - 1}\u0001`;
  const withTokens = text
    .split(TOKEN)
    .map((p, i) => {
      if (i % 2 === 0) return p;
      const value = p === '[CONFIRMAR]' ? '' : (o.vars[p.slice(2, -2)] ?? '');
      if (value) return hold(esc(value));
      flag.pending = true;
      if (!o.production) return hold(`<mark class="rb-pending">${esc(p)}</mark>`);
      return p === '[CONFIRMAR]' ? hold(esc(p)) : '';
    })
    .join('');
  return esc(withTokens)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, url: string) => (SAFE_URL.test(url) ? `<a href="${url}">${label}</a>` : label))
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_(.+?)_(?=[\s).,;:]|$)/g, '$1<em>$2</em>')
    .replace(/\u0001(\d+)\u0001/g, (_, i: string) => held[Number(i)] ?? '');
}

export function renderLegal(md: string, o: RenderOptions): LegalDoc {
  const flag = { pending: false };
  let title = '';
  const lead: string[] = [];
  const sections: { id: string; title: string; html: string[] }[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const push = (html: string) => sections.at(-1)?.html.push(html);
  const flush = () => {
    const text = para.join(' ');
    if (text) {
      if (sections.length) push(`<p>${inline(text, o, flag)}</p>`);
      else if (!/^_.*_$/.test(text)) lead.push(text); // the "_Versão … · …_" line is rebuilt by the page
    }
    if (list.length) push(`<ul>${list.map((li) => `<li>${inline(li, o, flag)}</li>`).join('')}</ul>`);
    para = [];
    list = [];
  };
  for (const raw of md.replace(/<!--[\s\S]*?-->/g, '').split('\n')) {
    const l = raw.trim();
    const h = /^(#{1,3})\s+(.*)$/.exec(l);
    if (h) {
      flush();
      if (h[1] === '#') title = h[2]!;
      else if (h[1] === '##') {
        const clean = h[2]!.replace(/^\d+\.\s*/, ''); // the component numbers the sections
        sections.push({ id: slug(clean), title: clean, html: [] });
      } else push(`<h3>${inline(h[2]!, o, flag)}</h3>`);
    } else if (/^[-*]\s+/.test(l)) {
      if (para.length) flush();
      list.push(l.replace(/^[-*]\s+/, ''));
    } else if (!l) flush();
    else {
      if (list.length) flush();
      para.push(l);
    }
  }
  flush();
  return {
    title,
    lead: lead.join(' ').replace(/\{\{(\w+)\}\}/g, (_, k: string) => o.vars[k] ?? ''),
    sections: sections.map((s) => ({ ...s, html: s.html.join('') })),
    pending: flag.pending,
  };
}
