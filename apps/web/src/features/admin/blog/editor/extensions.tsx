'use client';

// F27 T7 (D-909, D-944): the restricted Tiptap schema. Only what blogDocSchema accepts exists here: no H1, code, codeBlock, horizontalRule,
// strike, underline, hardBreak, tables or raw images. Node names and attrs match @remoa/contracts blog.ts one to one.
import { useEffect, useState, type ComponentType } from 'react';
import { Node, mergeAttributes, type Extensions } from '@tiptap/core';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Link from '@tiptap/extension-link';
import Blockquote from '@tiptap/extension-blockquote';
import { BulletList, ListItem, ListKeymap, OrderedList } from '@tiptap/extension-list';
import { Dropcursor, Gapcursor, Placeholder, TrailingNode, UndoRedo } from '@tiptap/extensions';
import { BLOG_LIMITS, calloutVariants, isSafeHref, type BlogFaqItem, type CalloutVariant } from '@remoa/contracts';
import { t } from '@remoa/strings/admin';
import { IconButton, Icon, focusRing } from '@remoa/ui';

const FLOW = '(paragraph|bulletList|orderedList)+';

/** Only the two rels the contract allows survive a paste (`noopener`, `ugc`… become null). */
const pickRel = (raw: string | null) => {
  const parts = (raw ?? '').toLowerCase().split(/\s+/);
  return parts.includes('sponsored') ? 'sponsored' : parts.includes('nofollow') ? 'nofollow' : null;
};
const json = <T,>(raw: string | null, fallback: T): T => {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const num = (raw: string | null) => (raw && /^\d+$/.test(raw) ? Number(raw) : null);

/** Asset id → public URL of images uploaded in this session (the doc only keeps `assetId`, D-909). */
export const assetUrls = new Map<string, string>();

/** Input bound to a node attr: local state keeps the caret, the attr follows on every change (undo still updates it). */
function useAttr(value: string, commit: (v: string) => void): [string, (v: string) => void] {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return [v, (x) => { setV(x); commit(x); }];
}

const small = `w-full rounded-[12px] border-[1.5px] bg-surface px-3 py-2 text-[15px] text-ink placeholder:text-muted ${focusRing}`;
const border = (bad: boolean) => (bad ? 'border-review' : 'border-border-strong');

function Field({ label, value, onChange, invalid, hint, multiline, maxLength }: { label: string; value: string; onChange: (v: string) => void; invalid?: boolean; hint?: string; multiline?: boolean; maxLength?: number }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-[13px] font-bold text-ink">
      {label}
      {multiline ? (
        <textarea rows={2} value={value} maxLength={maxLength} aria-invalid={invalid || undefined} onChange={(e) => onChange(e.target.value)} className={`${small} ${border(!!invalid)} font-normal`} />
      ) : (
        <input value={value} maxLength={maxLength} aria-invalid={invalid || undefined} onChange={(e) => onChange(e.target.value)} className={`${small} ${border(!!invalid)} font-normal`} />
      )}
      {invalid && hint ? <span className="text-[12.5px] font-semibold text-review-text">{hint}</span> : null}
    </label>
  );
}

const box = (selected: boolean) => `my-4 flex flex-col gap-2.5 rounded-[18px] border-[1.5px] bg-canvas p-3.5 not-italic ${selected ? 'border-primary' : 'border-border'}`;
const tag = 'text-xs font-bold uppercase tracking-[0.12em] text-muted';

const calloutLabel: Record<CalloutVariant, string> = {
  dica: t('adminBlog.editor.blocks.calloutTypes.tip'),
  atencao: t('adminBlog.editor.blocks.calloutTypes.warning'),
  nota: t('adminBlog.editor.blocks.calloutTypes.note'),
};

function CalloutView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const variant = node.attrs.variant as CalloutVariant;
  return (
    <NodeViewWrapper className={box(selected)} data-callout={variant}>
      <span contentEditable={false} className="flex items-center gap-2">
        <span className={tag}>{t('adminBlog.editor.blocks.callout')}</span>
        <select aria-label={t('adminBlog.editor.ui.blockFields.calloutVariant')} value={variant} onChange={(e) => updateAttributes({ variant: e.target.value })} className={`min-h-9 rounded-[10px] border border-border-strong bg-surface px-2 text-sm font-bold ${focusRing}`}>
          {calloutVariants.map((v) => <option key={v} value={v}>{calloutLabel[v]}</option>)}
        </select>
      </span>
      <NodeViewContent className="rounded-[12px] bg-surface px-3 py-1" />
    </NodeViewWrapper>
  );
}

function ImageView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const a = node.attrs as { assetId: string | null; src: string | null; alt: string; caption: string | null; width: number; height: number };
  const [alt, setAlt] = useAttr(a.alt ?? '', (v) => updateAttributes({ alt: v }));
  const [caption, setCaption] = useAttr(a.caption ?? '', (v) => updateAttributes({ caption: v.trim() ? v : null }));
  const url = a.src ?? (a.assetId ? assetUrls.get(a.assetId) : undefined);
  return (
    <NodeViewWrapper className={box(selected)} data-blog-image="">
      <span contentEditable={false} className="flex flex-col gap-2.5 sm:flex-row">
        {url ? (
          <img src={url} alt="" width={a.width} height={a.height} className="h-auto w-full rounded-[12px] object-cover sm:w-40" />
        ) : (
          <span className="flex h-24 w-full items-center justify-center gap-2 rounded-[12px] bg-surface text-sm text-muted sm:w-40"><Icon name="image" size={20} aria-hidden="true" />{t('adminBlog.editor.ui.blockFields.imageMissing')}</span>
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <Field label={t('adminBlog.editor.image.alt')} value={alt} onChange={setAlt} invalid={!alt.trim()} hint={t('adminBlog.editor.ui.blockFields.altRequired')} maxLength={BLOG_LIMITS.altMax} />
          <Field label={t('adminBlog.editor.image.caption')} value={caption} onChange={setCaption} maxLength={BLOG_LIMITS.captionMax} />
        </span>
      </span>
    </NodeViewWrapper>
  );
}

function ButtonView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const [text, setText] = useAttr(node.attrs.text as string, (v) => updateAttributes({ text: v }));
  const [href, setHref] = useAttr(node.attrs.href as string, (v) => updateAttributes({ href: v }));
  return (
    <NodeViewWrapper className={box(selected)} data-blog-button="">
      <span contentEditable={false} className="flex flex-col gap-2">
        <span className={tag}>{t('adminBlog.editor.blocks.button')}</span>
        <span className="flex flex-col gap-2 sm:flex-row">
          <Field label={t('adminBlog.editor.button.text')} value={text} onChange={setText} invalid={!text.trim()} hint={t('adminBlog.editor.ui.blockFields.altRequired')} maxLength={BLOG_LIMITS.buttonTextMax} />
          <Field label={t('adminBlog.editor.button.url')} value={href} onChange={setHref} invalid={!isSafeHref(href)} hint={t('adminBlog.editor.ui.blockFields.hrefInvalid')} />
        </span>
      </span>
    </NodeViewWrapper>
  );
}

function FaqItemFields({ n, item, onChange, onRemove, canRemove }: { n: number; item: BlogFaqItem; onChange: (i: BlogFaqItem) => void; onRemove: () => void; canRemove: boolean }) {
  const [q, setQ] = useAttr(item.q, (v) => onChange({ ...item, q: v }));
  const [a, setA] = useAttr(item.a, (v) => onChange({ ...item, a: v }));
  return (
    <span className="flex items-start gap-2 rounded-[14px] bg-surface p-2.5">
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <Field label={`${t('adminBlog.editor.faq.question')} ${n}`} value={q} onChange={setQ} invalid={!q.trim()} hint={t('adminBlog.editor.ui.blockFields.altRequired')} maxLength={BLOG_LIMITS.faqTextMax} />
        <Field label={t('adminBlog.editor.faq.answer')} value={a} onChange={setA} invalid={!a.trim()} hint={t('adminBlog.editor.ui.blockFields.altRequired')} multiline maxLength={BLOG_LIMITS.faqTextMax} />
      </span>
      {canRemove ? <IconButton aria-label={t('adminBlog.editor.ui.blockFields.faqRemove')} onClick={onRemove}><Icon name="trash" size={18} /></IconButton> : null}
    </span>
  );
}

function FaqView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const items = node.attrs.items as BlogFaqItem[];
  const set = (next: BlogFaqItem[]) => updateAttributes({ items: next });
  return (
    <NodeViewWrapper className={box(selected)} data-blog-faq="">
      <span contentEditable={false} className="flex flex-col gap-2">
        <span className={tag}>{t('adminBlog.editor.blocks.faq')}</span>
        {items.map((it, i) => (
          <FaqItemFields key={i} n={i + 1} item={it} canRemove={items.length > 1} onChange={(x) => set(items.map((y, j) => (j === i ? x : y)))} onRemove={() => set(items.filter((_, j) => j !== i))} />
        ))}
        {items.length < BLOG_LIMITS.faqItemsMax ? (
          <button type="button" onClick={() => set([...items, { q: '', a: '' }])} className={`min-h-11 w-fit rounded-[12px] border-[1.5px] border-dashed border-border-strong px-3.5 text-sm font-bold ${focusRing}`}>
            {t('adminBlog.editor.faq.addQuestion')}
          </button>
        ) : null}
      </span>
    </NodeViewWrapper>
  );
}

const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: FLOW,
  defining: true,
  addAttributes: () => ({
    variant: {
      default: 'dica',
      parseHTML: (el) => (calloutVariants as readonly string[]).includes(el.getAttribute('data-variant') ?? '') ? el.getAttribute('data-variant') : 'dica',
      renderHTML: (a) => ({ 'data-variant': a.variant }),
    },
  }),
  parseHTML: () => [{ tag: 'div[data-callout]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes({ 'data-callout': '' }, HTMLAttributes), 0],
  addNodeView: () => ReactNodeViewRenderer(CalloutView),
});

/** Atom node whose attrs travel in data-* attributes (copy/paste inside the editor keeps them). */
const atom = (name: string, attrs: Record<string, { default: unknown; parse: (el: HTMLElement) => unknown }>, view: ComponentType<ReactNodeViewProps>) =>
  Node.create({
    name,
    group: 'block',
    atom: true,
    selectable: true,
    addAttributes: () =>
      Object.fromEntries(Object.entries(attrs).map(([k, a]) => [k, { default: a.default, parseHTML: a.parse, renderHTML: (v: Record<string, unknown>) => ({ [`data-${k.toLowerCase()}`]: typeof v[k] === 'object' ? JSON.stringify(v[k]) : v[k] }) }])),
    parseHTML: () => [{ tag: `div[data-blog-${name}]` }],
    renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes({ [`data-blog-${name}`]: '' }, HTMLAttributes)],
    addNodeView: () => ReactNodeViewRenderer(view),
  });

const BlogImage = atom('image', {
  assetId: { default: null, parse: (el) => el.getAttribute('data-assetid') },
  src: { default: null, parse: (el) => el.getAttribute('data-src') },
  alt: { default: '', parse: (el) => el.getAttribute('data-alt') ?? '' },
  caption: { default: null, parse: (el) => el.getAttribute('data-caption') },
  width: { default: 1, parse: (el) => num(el.getAttribute('data-width')) ?? 1 },
  height: { default: 1, parse: (el) => num(el.getAttribute('data-height')) ?? 1 },
}, ImageView);
const BlogButton = atom('button', {
  text: { default: '', parse: (el) => el.getAttribute('data-text') ?? '' },
  href: { default: '', parse: (el) => el.getAttribute('data-href') ?? '' },
}, ButtonView);
const Faq = atom('faq', { items: { default: [{ q: '', a: '' }], parse: (el) => json(el.getAttribute('data-items'), [{ q: '', a: '' }]) } }, FaqView);

const BlogLink = Link.extend({
  addAttributes() {
    return { ...this.parent?.(), rel: { default: null, parseHTML: (el: HTMLElement) => pickRel(el.getAttribute('rel')) } };
  },
}).configure({
  openOnClick: false,
  autolink: false,
  // D-909: Tiptap's default rel ("noopener noreferrer nofollow") is rejected by the schema; the public renderer adds noopener itself.
  HTMLAttributes: { rel: null, target: null },
  isAllowedUri: (url) => isSafeHref(url),
});

export function blogExtensions(placeholder = ''): Extensions {
  return [
    Document,
    Paragraph,
    Text,
    Heading.configure({ levels: [2, 3, 4] }),
    Bold,
    Italic,
    BlogLink,
    BulletList,
    OrderedList,
    ListItem.extend({ content: 'paragraph (paragraph|bulletList|orderedList)*' }),
    ListKeymap,
    Blockquote.extend({ content: FLOW }),
    Callout,
    BlogImage,
    BlogButton,
    Faq,
    UndoRedo,
    Dropcursor,
    Gapcursor,
    TrailingNode,
    Placeholder.configure({ placeholder }),
  ];
}
