// F27 T7: pure helpers of the editor (document, block moves, Brasília time, checklist hints).
import type { Editor, JSONContent } from '@tiptap/core';
import { Selection } from '@tiptap/pm/state';
import {
  blogDocSchema, countWords, docHrefs, isExternalHref, isInternalHref, seoChecklist,
  type BlogDoc, type SeoCheckId, type SeoSubject,
} from '@remoa/contracts';
import { t } from '@remoa/strings/full';

/** The editor JSON through the contract (D-909): the same parse the API runs. null = some block is incomplete (alt, button, FAQ). */
export function parseDoc(json: JSONContent): BlogDoc | null {
  const r = blogDocSchema.safeParse(json);
  return r.success ? r.data : null;
}

export type BlockKind = 'paragraph' | 'h2' | 'h3' | 'h4' | 'bulletList' | 'orderedList' | 'blockquote' | 'callout' | 'button' | 'faq';
const para = { type: 'paragraph' };
const item = { type: 'listItem', content: [para] };
export const NEW_BLOCK: Record<BlockKind, JSONContent> = {
  paragraph: para,
  h2: { type: 'heading', attrs: { level: 2 } },
  h3: { type: 'heading', attrs: { level: 3 } },
  h4: { type: 'heading', attrs: { level: 4 } },
  bulletList: { type: 'bulletList', content: [item] },
  orderedList: { type: 'orderedList', content: [item] },
  blockquote: { type: 'blockquote', content: [para] },
  callout: { type: 'callout', attrs: { variant: 'dica' }, content: [para] },
  button: { type: 'button', attrs: { text: '', href: '' } },
  faq: { type: 'faq', attrs: { items: [{ q: '', a: '' }] } },
};

/** Top-level block holding the selection: its index and start position. */
function current(editor: Editor) {
  const { doc, selection } = editor.state;
  const index = Math.min(selection.$from.index(0), doc.childCount - 1);
  let start = 0;
  for (let k = 0; k < index; k++) start += doc.child(k).nodeSize;
  return { index, start, node: doc.child(index) };
}

/** Inserts `node` right after the current top-level block and puts the caret in it. */
export function insertBlock(editor: Editor, node: JSONContent) {
  const { start, node: cur } = current(editor);
  const at = start + cur.nodeSize;
  editor.chain().insertContentAt(at, node).setTextSelection(at + 1).focus().run();
}

/** Swaps the current top-level block with its neighbour (FR-6 "mover"). false at the edges. */
export function moveBlock(editor: Editor, dir: -1 | 1): boolean {
  const { doc } = editor.state;
  const { index, start, node } = current(editor);
  const other = index + dir;
  if (other < 0 || other >= doc.childCount) return false;
  const neighbour = doc.child(other);
  const from = dir < 0 ? start - neighbour.nodeSize : start;
  const pair = dir < 0 ? [node, neighbour] : [neighbour, node];
  const tr = editor.state.tr.replaceWith(from, from + node.nodeSize + neighbour.nodeSize, pair);
  const movedAt = dir < 0 ? from : from + neighbour.nodeSize;
  tr.setSelection(Selection.near(tr.doc.resolve(movedAt + (node.isAtom ? 0 : 1))));
  editor.view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
  return true;
}

/** Removes the current top-level block (the schema refills an empty doc with a paragraph). */
export function removeBlock(editor: Editor) {
  const { start, node } = current(editor);
  editor.chain().deleteRange({ from: start, to: start + node.nodeSize }).focus().run();
}

// --- Brasília time (FR-7). Brazil has no DST since 2019: fixed -03:00. ponytail: fixed offset; use a tz lib if DST returns.
const BRT = 'America/Sao_Paulo';
/** ISO → value of <input type="datetime-local"> in Brasília ("2026-10-08T09:00"). */
export function toBrasiliaInput(iso: Date | string | null): string {
  if (!iso) return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: BRT, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
/** datetime-local value read as Brasília → ISO (UTC). null when empty/invalid. */
export function fromBrasiliaInput(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const d = new Date(`${local}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
export const formatBrasilia = (iso: Date | string) => new Intl.DateTimeFormat('pt-BR', { timeZone: BRT, dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

// --- SEO checklist with the hint of each row (FR-8). States and blockers come from the contract (seoChecklist).
const titles: Record<SeoCheckId, string> = {
  title: t('adminBlog.seo.checklist.items.title'),
  description: t('adminBlog.seo.checklist.items.description'),
  slug: t('adminBlog.seo.checklist.items.slug'),
  cover: t('adminBlog.seo.checklist.items.cover'),
  h2: t('adminBlog.seo.checklist.items.heading'),
  hierarchy: t('adminBlog.seo.checklist.items.hierarchy'),
  words: t('adminBlog.seo.checklist.items.wordCount'),
  keyword: t('adminBlog.seo.checklist.items.keyword'),
  links: t('adminBlog.seo.checklist.items.links'),
  images: t('adminBlog.seo.checklist.items.images'),
};

export function checklistView(p: SeoSubject) {
  const report = seoChecklist(p);
  const blocks = p.content.content;
  const hrefs = docHrefs(p.content);
  const images = blocks.filter((b) => b.type === 'image');
  const state = (id: SeoCheckId) => report.items.find((i) => i.id === id)?.state;
  const hint: Record<SeoCheckId, string> = {
    title: t('adminBlog.editor.ui.checks.chars', { count: (p.seoTitle || p.title).trim().length }),
    description: t('adminBlog.editor.ui.checks.chars', { count: p.description.trim().length }),
    slug: state('slug') === 'ok' ? `/blog/${p.slug}` : t('adminBlog.editor.ui.checks.slugBad'),
    cover: state('cover') === 'ok' ? t('adminBlog.editor.ui.checks.coverOk') : t('adminBlog.editor.ui.cover.altMissing'),
    h2: t('adminBlog.editor.ui.checks.h2', { count: blocks.filter((b) => b.type === 'heading' && b.attrs.level === 2).length }),
    hierarchy: state('hierarchy') === 'ok' ? t('adminBlog.editor.ui.checks.hierarchyOk') : t('adminBlog.editor.ui.checks.hierarchyBad'),
    words: t('adminBlog.editor.ui.checks.words', { count: countWords(p.content) }),
    keyword: state('keyword') === 'ok' ? t('adminBlog.editor.ui.checks.keywordOk') : t('adminBlog.editor.ui.checks.keywordBad'),
    links: t('adminBlog.editor.ui.checks.links', { internal: hrefs.filter(isInternalHref).length, external: hrefs.filter(isExternalHref).length }),
    images: t('adminBlog.editor.ui.checks.images', { count: images.length, missing: images.filter((i) => !i.attrs.alt.trim()).length }),
  };
  return {
    items: report.items.map((i) => ({ id: i.id, state: i.state, title: titles[i.id], hint: hint[i.id] })),
    /** SeoPanel shows ok items out of 10 (mock "score/total"); the contract's 0–100 score counts warnings as half. */
    score: report.items.filter((i) => i.state === 'ok').length,
    total: report.items.length,
  };
}
