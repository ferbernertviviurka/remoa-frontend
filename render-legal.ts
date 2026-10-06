// F27 FR-42/43 (D-951): minimal server-side renderer for content/legal/*.md. Subset: <!-- comments -->, # ## ###, paragraphs, - lists,
// **bold**, _italic_, [links](url). Every piece of text is escaped; `{{var}}` and `[CONFIRMAR]` become <mark class="rb-pending"> outside production.
import type { LegalSection } from '@remoa/ui';

export type RenderOptions = { vars: Record<string, string>; production: boolean };
export type LegalDoc = { title: string; lead: string; sections: LegalSection[]; pending: boolean };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const SAFE_URL = /^(https?:\/\/|mailto:|\/|#)/i;
const TOKEN = /(\{\{\w+\}\}|\[CONFIRMAR\])/;

function inline(text: string, o: RenderOptions, flag: { pending: boolean }): string {
  const marks: string[] = [];
  const hold = (html: string) => `\u0001${marks.push(html) - 1}\u0001`;
  const raw = text
    .split(TOKEN)
    .map((p) => {
      const name = /^\{\{(\w+)\}\}$/.exec(p)?.[1];
      const value = name === undefined ? (p === '[CONFIRMAR]' ? '' : null) : (o.vars[name] ?? '');
      if (value === null) return p;
      const label = name === undefined ? p : value || p;
      if (value && name !== undefined) return hold(esc(value));
      flag.pending = true;
      return o.production && name === undefined ? hold(esc(p)) : o.production ? '' : hold(`<mark class="rb-pending">${esc(label)}</mark>`);
    })
    .join('');
  return esc(raw)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label: string, url: string) => (SAFE_URL.test(url) ? `<a href="${url}">${label}</a>` : label))
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_(.+?)_(?=[\s).,;:]|$)/g, '$1<em>$2</em>')
    .replace(/\u0001(\d+)\u0001/g, (_, i: string) => marks[Number(i)] ?? '');
}

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function renderLegal(md: string, o: RenderOptions): LegalDoc {
  const flag = { pending: false };
  const doc: LegalDoc = { title: '', lead: '', sections: [], pending: false };
  const leadLines: string[] = [];
  let cur: { id: string; title: string; html: string[] } | null = null;
  let para: string[] = [];
  let list: string[] = [];
  const out = (html: string) => (cur ? cur.html.push(html) : void 0);
  const flush = () => {
    if (para.length) {
      const text = para.join(' ');
      if (cur) out(`<p>${inline(text, o, flag)}</p>`);
      else if (!/^_.*_$/.test(text)) leadLines.push(text); // the "_Versão … · …_" line is rebuilt by the page
    }
    if (list.length) out(`<ul>${list.map((li) => `<li>${inline(li, o, flag)}</li>`).join('')}</ul>`);
    para = [];
    list = [];
  };
  for (const line of md.replace(/<!--[\s\S]*?-->/g, '').split('\n')) {
    const l = line.trimEnd();
    const h = /^(#{1,3})\s+(.*)$/.exec(l);
    if (h) {
      flush();
      const [, hashes, title] = h as unknown as [string, string, string];
      if (hashes === '#') doc.title = title;
      else if (hashes === '##') {
        const clean = title.replace(/^\d+\.\s*/, ''); // the component numbers the sections
        cur = { id: slug(clean), title: clean, html: [] };
        doc.sections.push({ id: cur.id, title: clean, html: '' });
        (cur as { html: string[] }).html = [];
        sectionsHtml.set(cur.id, cur.html);
      } else out(`<h3>${inline(title, o, flag)}</h3>`);
    } else if (/^[-*]\s+/.test(l)) {
      if (para.length) flush();
      list.push(l.replace(/^[-*]\s+/, ''));
    } else if (l.trim() === '') flush();
    else {
      if (list.length) flush();
      para.push(l.trim());
    }
  }
  flush();
  doc.lead = leadLines.join(' ').replace(/\{\{(\w+)\}\}/g, (_, k: string) => o.vars[k] ?? '');
  doc.sections = doc.sections.map((s) => ({ ...s, html: (sectionsHtml.get(s.id) ?? []).join('') }));
  sectionsHtml.clear();
  doc.pending = flag.pending;
  return doc;
}
const sectionsHtml = new Map<string, string[]>();
