'use client';

// F27 T7 (FR-6): block toolbar (insert, move, remove), bold/italic, the link dialog (internal search + external with nofollow/sponsored)
// and the image dialog (upload first, the node only enters the document once the alt text is typed, D-909).
import { useEffect, useState } from 'react';
import { EditorContent, useEditorState, type Editor } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { isSafeHref, type BlogAsset, type BlogListItem } from '@remoa/contracts';
import { t } from '@remoa/strings/admin';
import { Button, Checkbox, Dialog, Icon, IconButton, Input, Menu, focusRing } from '@remoa/ui';
import { listBlogPosts } from '../api';
import { assetUrls } from './extensions';
import { NEW_BLOCK, insertBlock, moveBlock, removeBlock, type BlockKind } from './doc';
import { ImageUpload } from './image-upload';

const blogPath = (slug: string) => `/blog/${slug}`;
type Rel = 'nofollow' | 'sponsored' | null;

const BLOCKS: Array<[BlockKind | 'image', string]> = [
  ['paragraph', t('adminBlog.editor.blocks.paragraph')],
  ['h2', t('adminBlog.editor.blocks.heading2')],
  ['h3', t('adminBlog.editor.blocks.heading3')],
  ['h4', t('adminBlog.editor.blocks.heading4')],
  ['bulletList', t('adminBlog.editor.blocks.list')],
  ['orderedList', t('adminBlog.editor.blocks.orderedList')],
  ['blockquote', t('adminBlog.editor.blocks.blockquote')],
  ['callout', t('adminBlog.editor.blocks.callout')],
  ['image', t('adminBlog.editor.blocks.image')],
  ['button', t('adminBlog.editor.blocks.button')],
  ['faq', t('adminBlog.editor.blocks.faq')],
];

const tool = (on: boolean) => `min-h-11 rounded-[12px] border-[1.5px] px-3 text-[13.5px] font-bold ${on ? 'border-primary bg-primary-tint text-primary-deep' : 'border-border-strong bg-surface text-ink hover:border-primary'} ${focusRing}`;

// Radix gives focus back to the menu trigger when it closes; act on the editor after that.
const later = (fn: () => void) => setTimeout(fn, 0);

export function ContentEditor({ editor, slug, postId }: { editor: Editor; slug: string; postId: string }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      link: e.isActive('link'),
      atom: e.state.selection instanceof NodeSelection,
      first: e.state.selection.$from.index(0) === 0,
      last: e.state.selection.$from.index(0) >= e.state.doc.childCount - 1,
    }),
  });
  const [linkOpen, setLinkOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);

  const add = (k: BlockKind | 'image') => later(() => (k === 'image' ? setImageOpen(true) : insertBlock(editor, NEW_BLOCK[k])));

  return (
    <div className="flex flex-col gap-3">
      <div role="toolbar" aria-label={t('adminBlog.editor.ui.content.toolbar')} className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-[16px] border border-border bg-surface/95 p-2 backdrop-blur">
        <Menu label={t('adminBlog.editor.blocks.addButton')} trigger="tint" icon={<Icon name="plus" size={16} />} items={BLOCKS.map(([k, label]) => ({ label, onSelect: () => add(k) }))} />
        <span aria-hidden="true" className="h-6 w-px bg-divider" />
        <button type="button" aria-pressed={s.bold} disabled={s.atom} onClick={() => editor.chain().focus().toggleBold().run()} className={tool(s.bold)}>{t('adminBlog.editor.ui.content.bold')}</button>
        <button type="button" aria-pressed={s.italic} disabled={s.atom} onClick={() => editor.chain().focus().toggleItalic().run()} className={tool(s.italic)}>{t('adminBlog.editor.ui.content.italic')}</button>
        <button type="button" aria-pressed={s.link} disabled={s.atom} onClick={() => setLinkOpen(true)} className={`${tool(s.link)} inline-flex items-center gap-1.5`}>
          <Icon name="link" size={16} aria-hidden="true" />{t('adminBlog.editor.ui.content.insertLink')}
        </button>
        <span aria-hidden="true" className="h-6 w-px bg-divider" />
        <IconButton aria-label={t('adminBlog.editor.blocks.moveUp')} disabled={s.first} onClick={() => moveBlock(editor, -1)}><Icon name="left" size={18} style={{ transform: 'rotate(90deg)' }} /></IconButton>
        <IconButton aria-label={t('adminBlog.editor.blocks.moveDown')} disabled={s.last} onClick={() => moveBlock(editor, 1)}><Icon name="left" size={18} style={{ transform: 'rotate(-90deg)' }} /></IconButton>
        <IconButton aria-label={t('adminBlog.editor.blocks.delete')} onClick={() => removeBlock(editor)}><Icon name="trash" size={18} /></IconButton>
      </div>
      <div className="rb-article rounded-[18px] border-[1.5px] border-border-strong bg-surface px-5 py-4 focus-within:border-primary [&_.ProseMirror]:min-h-[320px] [&_.ProseMirror]:outline-none [&_.is-editor-empty]:before:pointer-events-none [&_.is-editor-empty]:before:float-left [&_.is-editor-empty]:before:h-0 [&_.is-editor-empty]:before:text-muted [&_.is-editor-empty]:before:content-[attr(data-placeholder)] [&_h4]:font-display [&_h4]:text-lg [&_h4]:font-extrabold">
        <EditorContent editor={editor} aria-label={t('adminBlog.editor.ui.content.label')} />
      </div>
      {linkOpen ? <LinkDialog editor={editor} postId={postId} onClose={() => setLinkOpen(false)} /> : null}
      {imageOpen ? <ImageDialog editor={editor} slug={slug} onClose={() => setImageOpen(false)} /> : null}
    </div>
  );
}

function LinkDialog({ editor, postId, onClose }: { editor: Editor; postId: string; onClose: () => void }) {
  const [init] = useState(() => {
    if (editor.isActive('link')) editor.chain().extendMarkRange('link').run();
    const { from, to } = editor.state.selection;
    const attrs = editor.getAttributes('link') as { href?: string; rel?: Rel };
    return { text: editor.state.doc.textBetween(from, to, ' '), href: attrs.href ?? '', rel: attrs.rel ?? null, editing: !!attrs.href };
  });
  const [text, setText] = useState(init.text);
  const [href, setHref] = useState(init.href);
  const [rel, setRel] = useState<Rel>(init.rel);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<BlogListItem[] | null>(null);

  useEffect(() => {
    if (!q.trim()) return setHits(null);
    const id = setTimeout(() => {
      void listBlogPosts({ q: q.trim(), pageSize: 8 }).then((r) => setHits(r.ok ? r.data.items.filter((p) => p.id !== postId) : []));
    }, 300);
    return () => clearTimeout(id);
  }, [q, postId]);

  const valid = isSafeHref(href) && !!text.trim();
  const apply = () => {
    if (!valid) return;
    const mark = { type: 'link', attrs: { href: href.trim(), rel } };
    editor.chain().focus().insertContent({ type: 'text', text, marks: [mark] }).unsetMark('link').run();
    onClose();
  };
  const remove = () => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); onClose(); };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }} title={t('adminBlog.editor.ui.link.title')} closeLabel={t('adminBlog.newPost.closeLabel')}>
      <form className="flex flex-col gap-3.5" onSubmit={(e) => { e.preventDefault(); apply(); }}>
        <Input label={t('adminBlog.editor.ui.link.text')} value={text} onChange={(e) => setText(e.target.value)} required />
        <Input label={t('adminBlog.editor.ui.link.address')} placeholder={t('adminBlog.editor.ui.link.addressPlaceholder')} value={href} onChange={(e) => setHref(e.target.value)} aria-invalid={href && !isSafeHref(href) ? true : undefined} />
        {href && !isSafeHref(href) ? <span role="alert" className="-mt-2 text-[12.5px] font-semibold text-review-text">{t('adminBlog.editor.ui.link.invalid')}</span> : null}
        <Input variant="search" label={t('adminBlog.editor.ui.link.search')} placeholder={t('adminBlog.editor.ui.link.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        {hits ? (
          hits.length ? (
            <ul className="m-0 flex max-h-48 list-none flex-col gap-1 overflow-y-auto p-0">
              {hits.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => { setHref(blogPath(p.slug)); setRel(null); if (!text.trim()) setText(p.title); setQ(''); }} className={`flex min-h-11 w-full flex-col rounded-[12px] px-3 py-1.5 text-left hover:bg-primary-tint ${focusRing}`}>
                    <span className="text-sm font-bold">{p.title}</span>
                    <span className="text-[12.5px] text-muted">{blogPath(p.slug)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <span className="text-[13px] text-muted">{t('adminBlog.editor.ui.link.searchEmpty')}</span>
        ) : null}
        <Checkbox label={t('adminBlog.editor.ui.link.nofollow')} checked={rel === 'nofollow'} onCheckedChange={(c) => setRel(c === true ? 'nofollow' : null)} />
        <Checkbox label={t('adminBlog.editor.ui.link.sponsored')} checked={rel === 'sponsored'} onCheckedChange={(c) => setRel(c === true ? 'sponsored' : null)} />
        <span className="text-[12.5px] text-muted">{t('adminBlog.editor.ui.link.note')}</span>
        <span className="flex flex-wrap justify-end gap-2">
          {init.editing ? <Button variant="quiet" size="sm" onClick={remove}>{t('adminBlog.editor.ui.link.remove')}</Button> : null}
          <Button type="submit" size="sm" disabled={!valid}>{t('adminBlog.editor.ui.link.apply')}</Button>
        </span>
      </form>
    </Dialog>
  );
}

function ImageDialog({ editor, slug, onClose }: { editor: Editor; slug: string; onClose: () => void }) {
  const [asset, setAsset] = useState<BlogAsset | null>(null);
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const insert = () => {
    if (!asset || !alt.trim()) return;
    assetUrls.set(asset.id, asset.url);
    insertBlock(editor, { type: 'image', attrs: { assetId: asset.id, src: null, alt: alt.trim(), caption: caption.trim() || null, width: asset.width, height: asset.height } });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }} title={t('adminBlog.editor.ui.blockFields.imageTitle')} closeLabel={t('adminBlog.newPost.closeLabel')}>
      <form className="flex flex-col gap-3.5" onSubmit={(e) => { e.preventDefault(); insert(); }}>
        {asset ? (
          <img src={asset.url} alt="" width={asset.width} height={asset.height} className="h-auto max-h-48 w-full rounded-[14px] object-cover" />
        ) : null}
        <ImageUpload slug={slug} label={asset ? t('adminBlog.editor.ui.cover.replace') : t('adminBlog.editor.ui.blockFields.imagePick')} onUploaded={setAsset} />
        <Input label={t('adminBlog.editor.image.alt')} value={alt} onChange={(e) => setAlt(e.target.value)} required />
        <Input label={t('adminBlog.editor.image.caption')} value={caption} onChange={(e) => setCaption(e.target.value)} />
        <span className="flex justify-end">
          <Button type="submit" size="sm" disabled={!asset || !alt.trim()}>{t('adminBlog.editor.ui.blockFields.insert')}</Button>
        </span>
      </form>
    </Dialog>
  );
}
