'use client';

// F27 T7 (FR-5 to FR-11): the post editor. Fields live in React state, the body in Tiptap; both feed the autosave (only changed and valid
// fields go out), the live SEO checklist and the publish blockers, all computed with the contract helpers the API also runs.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useEditor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import {
  BLOG_LIMITS, blogErrors, blogPostInputSchema, publishBlockers, slugify,
  type BlogCategory, type BlogPost, type BlogRevision, type BlogTemplate, type PreviewLink, type PublishBlocker, type SeoSubject,
} from '@remoa/contracts';
import { t } from '@remoa/strings';
import {
  AdminHeader, AutosaveIndicator, Button, Dialog, Icon, PublishBlockers, PublishPanel, SeoPanel, Tabs, fieldControl, focusRing, useToast,
  type PublishStatus,
} from '@remoa/ui';
import { blogAction, blogPatch } from '../api';
import { listRevisions } from './api';
import { assetUrls, blogExtensions } from './extensions';
import { checklistView, formatBrasilia, fromBrasiliaInput, parseDoc, toBrasiliaInput } from './doc';
import { ImageUpload } from './image-upload';
import { ContentEditor } from './content-editor';
import { useAutosave, type SaveError } from './use-autosave';

type Form = {
  title: string; description: string; coverAssetId: string | null; coverAlt: string; seoTitle: string; slug: string;
  focusKeyword: string; robots: 'index' | 'noindex'; template: BlogTemplate; categoryId: string; authorId: string;
};
const formOf = (p: BlogPost): Form => ({
  title: p.title, description: p.description, coverAssetId: p.cover?.id ?? null, coverAlt: p.coverAlt, seoTitle: p.seoTitle ?? '', slug: p.slug,
  focusKeyword: p.focusKeyword ?? '', robots: p.robots, template: p.template, categoryId: p.category?.id ?? '', authorId: p.author?.id ?? '',
});
/** Form → PATCH body (blogPostInputSchema keys). */
const bodyOf = (f: Form, content: unknown) => ({
  title: f.title, description: f.description, coverAssetId: f.coverAssetId, coverAlt: f.coverAlt, seoTitle: f.seoTitle.trim() || null, slug: f.slug,
  focusKeyword: f.focusKeyword.trim() || null, robots: f.robots, template: f.template, categoryId: f.categoryId || null, authorId: f.authorId || null, content,
});
const shape = blogPostInputSchema.shape;
/** slugify keeps a hyphen the admin is still typing ("como-" → "como-"); a trailing one stays invalid (not saved) until more text follows. */
export const typingSlug = (v: string) => (v.length >= BLOG_LIMITS.slugMax ? slugify(v) : slugify(`${v}a`).slice(0, -1));
const fits = (k: keyof typeof shape, v: unknown) => shape[k].safeParse(v).success;

const blockerText: Record<PublishBlocker, string> = {
  title: t('adminBlog.publish.missingItems.title'),
  description: t('adminBlog.publish.missingItems.description'),
  slug: t('adminBlog.publish.missingItems.slug'),
  cover: t('adminBlog.publish.missingItems.cover'),
  h2: t('adminBlog.publish.missingItems.heading'),
};
const templates = (['leitura', 'guia', 'destaque'] as const).map((v) => ({ value: v, name: t(`adminBlog.newPost.templates.${v}.name`), description: t(`adminBlog.newPost.templates.${v}.description`) }));
const statusOptions = (['draft', 'scheduled', 'published'] as const).map((v) => ({ value: v, label: t(`adminBlog.publication.statusOptions.${v}`) }));

export type PostEditorProps = { post: BlogPost; categories: BlogCategory[]; me: { id: string; name: string }; site: string };

export function PostEditor({ post: initialPost, categories, me, site }: PostEditorProps) {
  const { toast } = useToast();
  const [post, setPost] = useState(initialPost);
  const [f, setF] = useState(() => formOf(initialPost));
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const [coverUrl, setCoverUrl] = useState(initialPost.cover?.url ?? null);
  const [json, setJson] = useState<JSONContent | null>(null);
  const [rejectedSlug, setRejectedSlug] = useState('');
  const [intent, setIntent] = useState<PublishStatus>(initialPost.status === 'archived' ? 'draft' : initialPost.status);
  const [scheduleAt, setScheduleAt] = useState(toBrasiliaInput(initialPost.publishAt));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const editor = useEditor({
    extensions: blogExtensions(t('adminBlog.editor.ui.content.placeholder')),
    content: initialPost.content,
    immediatelyRender: false,
    editorProps: { attributes: { 'aria-label': t('adminBlog.editor.ui.content.label') } }, // axe aria-input-field-name
    onCreate: ({ editor: e }) => setJson(e.getJSON()),
    onUpdate: ({ editor: e }) => setJson(e.getJSON()),
  });

  const doc = useMemo(() => (json ? parseDoc(json) : null), [json]);
  const contentDoc = doc ?? post.content;
  const subject: SeoSubject = { ...f, coverAlt: f.coverAlt, content: contentDoc };
  const seo = checklistView(subject);
  const blockers = publishBlockers(subject);

  // --- autosave (D-910, D-945): invalid fields stay local (undefined) so one bad field never blocks the others.
  const values = useMemo(() => {
    const b = bodyOf(f, doc ?? undefined);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(b)) out[k] = v !== undefined && fits(k as keyof typeof shape, v) ? v : undefined;
    if (b.slug === rejectedSlug) out.slug = undefined;
    if (!json) out.content = undefined;
    return out;
  }, [f, doc, json, rejectedSlug]);
  const invalid = { title: !fits('title', f.title), slug: !fits('slug', f.slug), content: !!json && !doc };
  const onError = useCallback((e: SaveError, patch: Record<string, unknown>) => {
    if (e.message === blogErrors.slugTaken && typeof patch.slug === 'string') setRejectedSlug(patch.slug);
    if (e.code === 'reauth_required') toast({ title: t('adminBlog.editor.ui.reauth'), tone: 'danger' });
  }, [toast]);
  const send = useCallback(async (patch: Record<string, unknown>) => {
    const r = await blogPatch<{ post: BlogPost }>(`/posts/${post.id}`, patch);
    return r.ok ? { ok: true as const } : r;
  }, [post.id]);
  const autosave = useAutosave({
    values, initial: bodyOf(formOf(initialPost), initialPost.content), send, onError,
    blocked: invalid.title || invalid.slug || invalid.content,
  });
  // The editor may normalize the stored doc on load (list attrs): that is the baseline, not an edit.
  const baselined = useRef(false);
  if (json && !baselined.current) {
    baselined.current = true;
    autosave.reset({ ...values, content: parseDoc(json) ?? undefined });
  }

  const status = post.status;
  const scheduleIso = fromBrasiliaInput(scheduleAt);
  const scheduleError = intent === 'scheduled' && (!scheduleIso || new Date(scheduleIso).getTime() <= Date.now()) ? t('adminBlog.editor.ui.scheduleInPast') : undefined;
  const primary = intent === 'scheduled' ? 'schedule' : status === 'published' ? 'update' : 'publish';
  const missing = blockers.map((b) => blockerText[b]);
  if (invalid.content) missing.push(t('adminBlog.editor.ui.content.invalid'));

  const fail = (e: { code: string; message: string }) =>
    toast({ title: e.code === 'reauth_required' ? t('adminBlog.editor.ui.reauth') : t('adminBlog.editor.ui.actionError'), tone: 'danger' });

  const saveNow = async () => {
    if (await autosave.flush()) toast({ title: t('adminBlog.editor.ui.updated') });
  };

  const onPrimary = () => {
    if (primary === 'update') return void saveNow();
    setConfirm(true);
  };

  const doPublish = async () => {
    setBusy(true);
    try {
      if (!(await autosave.flush())) return fail({ code: 'internal', message: 'save' });
      const r = primary === 'schedule'
        ? await blogAction<{ post: BlogPost }>(`/posts/${post.id}/schedule`, { publishAt: scheduleIso })
        : await blogAction<{ post: BlogPost }>(`/posts/${post.id}/publish`);
      if (!r.ok) {
        // 422 publish_blocked: the API's `blockers` sit outside the error envelope (dropped by runAdminAction); publishBlockers() gives the same
        // ids and the dialog already lists them. Locally clean but blocked = state the server doesn't have yet (D-947).
        if ([r.error.code, r.error.message].includes(blogErrors.publishBlocked) && blockers.length) return;
        if ([r.error.code, r.error.message].includes(blogErrors.scheduleInPast)) { setConfirm(false); return toast({ title: t('adminBlog.editor.ui.scheduleInPast'), tone: 'danger' }); }
        return fail(r.error);
      }
      setPost(r.data.post);
      if (r.data.post.status !== 'archived') setIntent(r.data.post.status);
      setConfirm(false);
      toast(primary === 'schedule'
        ? { title: t('adminBlog.editor.ui.scheduled', { date: formatBrasilia(scheduleIso ?? '') }) }
        : { title: t('adminBlog.publish.sitemapUpdated'), description: t('adminBlog.publish.success') });
    } finally {
      setBusy(false);
    }
  };

  const preview = async () => {
    const w = window.open('', '_blank'); // opened in the click, so popup blockers allow it
    const saved = await autosave.flush();
    const r = saved ? await blogAction<PreviewLink>(`/posts/${post.id}/preview`) : null;
    if (!r?.ok || !w) {
      w?.close();
      return toast({ title: t('adminBlog.editor.ui.previewError'), tone: 'danger' });
    }
    w.opener = null;
    w.location.href = `/blog/preview/${encodeURIComponent(r.data.token)}`;
  };

  const restore = async (rev: BlogRevision) => {
    const r = await blogAction<{ post: BlogPost }>(`/posts/${post.id}/revisions/${rev.id}/restore`);
    if (!r.ok) return fail(r.error);
    const p = r.data.post;
    setPost(p);
    setF(formOf(p));
    editor?.commands.setContent(p.content);
    autosave.reset(bodyOf(formOf(p), editor ? parseDoc(editor.getJSON()) ?? p.content : p.content));
    toast({ title: t('adminBlog.editor.ui.revisions.restored') });
  };

  const saveState = autosave.state === 'error' ? 'error' : autosave.state === 'saving' ? 'saving' : autosave.unsaved ? 'saving' : 'saved';
  const saveText = autosave.state === 'error' ? t('adminBlog.editor.ui.autosave.error')
    : autosave.state === 'saving' ? t('adminBlog.editor.autosave.saving')
      : autosave.unsaved ? t('adminBlog.editor.ui.autosave.pending') : t('adminBlog.editor.autosave.saved');
  const templateName = templates.find((x) => x.value === f.template)?.name ?? '';
  const authors = [{ value: '', label: t('adminBlog.editor.ui.authorTeam') }, { value: me.id, label: me.name }];
  if (post.author && post.author.id !== me.id) authors.push({ value: post.author.id, label: post.author.name ?? t('adminBlog.editor.ui.authorTeam') });

  return (
    <div className="flex min-h-dvh flex-col" onBlur={() => { if (autosave.unsaved) void autosave.flush(); }}>
      <AdminHeader title={f.title || t('adminBlog.editor.title')} subtitle={t('adminBlog.editor.ui.subtitle', { slug: f.slug, template: templateName })}>
        <span className="flex flex-wrap items-center justify-end gap-2.5">
          <AutosaveIndicator state={saveState} text={saveText} />
          <Button variant="secondary" size="sm" icon={<Icon name="eye" size={18} />} onClick={() => void preview()}>{t('adminBlog.editor.preview')}</Button>
          <Button variant="secondary" size="sm" onClick={() => void saveNow()}>{t('adminBlog.editor.saveDraft')}</Button>
          <Button size="sm" icon={<Icon name="send" size={18} />} onClick={onPrimary}>{t(`adminBlog.editor.ui.primary.${primary}`)}</Button>
        </span>
      </AdminHeader>

      <div className="grid gap-7 px-4 py-6 md:px-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Labeled id="post-title" label={t('adminBlog.editor.titleLabel')} aside={t('adminBlog.editor.ui.titleCount', { count: f.title.length })}
            error={invalid.title ? t('adminBlog.editor.ui.titleTooShort') : undefined}>
            <input id="post-title" value={f.title} maxLength={BLOG_LIMITS.titleMax} aria-invalid={invalid.title || undefined} onChange={(e) => set('title', e.target.value)}
              className={`h-16 font-display text-[26px] font-extrabold tracking-[-0.02em] ${fieldControl} ${focusRing}`} />
          </Labeled>
          <Labeled id="post-desc" label={t('adminBlog.editor.ui.descriptionLabel')} aside={t('adminBlog.editor.ui.descriptionCount', { count: f.description.length })} warn={f.description.length > BLOG_LIMITS.descriptionCounter}>
            <textarea id="post-desc" rows={3} value={f.description} maxLength={BLOG_LIMITS.descriptionMax} placeholder={t('adminBlog.editor.descriptionPlaceholder')} onChange={(e) => set('description', e.target.value)} className={`py-2.5 ${fieldControl} ${focusRing}`} />
          </Labeled>

          <section aria-labelledby="cover-h" className="flex flex-col gap-2">
            <h2 id="cover-h" className="m-0 text-[15px] font-bold">{t('adminBlog.editor.coverLabel')}</h2>
            <div className="flex flex-col gap-4 rounded-[18px] border border-border bg-surface p-4 sm:flex-row">
              {coverUrl ? (
                <img src={coverUrl} alt={t('adminBlog.editor.ui.cover.previewAlt')} width={1200} height={630} className="h-auto w-full rounded-[14px] object-cover sm:w-52" />
              ) : (
                <span className="flex aspect-[1200/630] w-full items-center justify-center rounded-[14px] bg-canvas text-muted sm:w-52"><Icon name="image" size={28} aria-hidden="true" /></span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <Labeled id="cover-alt" label={t('adminBlog.editor.coverAltLabel')} error={f.coverAssetId && !f.coverAlt.trim() ? t('adminBlog.editor.ui.cover.altMissing') : undefined}>
                  <input id="cover-alt" value={f.coverAlt} maxLength={BLOG_LIMITS.altMax} placeholder={t('adminBlog.editor.coverAltPlaceholder')} aria-invalid={(!!f.coverAssetId && !f.coverAlt.trim()) || undefined}
                    onChange={(e) => set('coverAlt', e.target.value)} className={`h-12 ${fieldControl} ${focusRing}`} />
                </Labeled>
                <ImageUpload slug={f.slug} label={coverUrl ? t('adminBlog.editor.ui.cover.replace') : t('adminBlog.editor.ui.cover.upload')}
                  onUploaded={(a) => { assetUrls.set(a.id, a.url); setCoverUrl(a.url); set('coverAssetId', a.id); }} />
                <span className="text-[12.5px] text-muted">{t('adminBlog.editor.ui.cover.hint')}</span>
              </div>
            </div>
          </section>

          <section aria-labelledby="content-h" className="flex flex-col gap-2">
            <h2 id="content-h" className="m-0 text-[15px] font-bold">{t('adminBlog.editor.ui.content.label')}</h2>
            {invalid.content ? <span role="alert" className="rounded-[14px] bg-review-bg px-3.5 py-2.5 text-sm text-review-text">{t('adminBlog.editor.ui.content.invalid')}</span> : null}
            {editor ? <ContentEditor editor={editor} slug={f.slug} postId={post.id} /> : <div className="min-h-[360px] rounded-[18px] border-[1.5px] border-border-strong bg-surface" />}
          </section>
        </div>

        <aside className="flex min-w-0 flex-col lg:sticky lg:top-4 lg:self-start">
          <Tabs label={t('adminBlog.editor.ui.tabs')} tabs={[
            {
              value: 'pub', label: t('adminBlog.publication.title'), content: (
                <PublishPanel
                  labels={{ template: t('adminBlog.publication.templateLabel'), status: t('adminBlog.publication.statusLabel'), scheduleAt: t('adminBlog.publication.scheduleLabel'), scheduleHint: t('adminBlog.editor.ui.publication.scheduleHint'), category: t('adminBlog.publication.categoryLabel'), author: t('adminBlog.publication.authorLabel'), viewOnSite: t('adminBlog.publication.viewOnSite') }}
                  templatePicker={{ value: f.template, onChange: (v) => set('template', v), options: templates }}
                  template={f.template}
                  statusOptions={statusOptions} status={intent} onStatusChange={setIntent}
                  scheduleAt={scheduleAt} onScheduleAtChange={setScheduleAt} scheduleError={scheduleAt ? scheduleError : undefined}
                  categories={[{ value: '', label: t('adminBlog.editor.ui.categoryNone') }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
                  category={f.categoryId} onCategoryChange={(v) => set('categoryId', v)}
                  authors={authors} author={f.authorId} onAuthorChange={(v) => set('authorId', v)}
                  viewHref={status === 'published' ? `/blog/${post.slug}` : undefined}
                />
              ),
            },
            {
              value: 'seo', label: t('adminBlog.seo.title'), content: (
                <SeoPanel
                  labels={{ preview: t('adminBlog.editor.ui.seo.preview'), titleLabel: t('adminBlog.editor.ui.seo.titleLabel'), titleHint: t('adminBlog.editor.ui.seo.titleHint'), slugLabel: t('adminBlog.seo.sluzLabel'), slugHint: invalid.slug ? t('adminBlog.editor.ui.slugInvalid') : f.slug === rejectedSlug ? t('adminBlog.editor.ui.slugTaken') : t('adminBlog.editor.ui.seo.slugHint'), keywordLabel: t('adminBlog.seo.keywordLabel'), keywordPlaceholder: t('adminBlog.editor.ui.seo.keywordPlaceholder'), indexLabel: t('adminBlog.editor.ui.seo.indexLabel'), indexNote: t('adminBlog.editor.ui.seo.indexNote'), noindexNote: t('adminBlog.editor.ui.seo.noindexNote'), checklist: t('adminBlog.seo.checklist.label') }}
                  site={site} postTitle={f.title}
                  description={f.description.length > BLOG_LIMITS.descriptionCounter ? `${f.description.slice(0, BLOG_LIMITS.descriptionCounter - 1)}…` : f.description}
                  seoTitle={f.seoTitle} onSeoTitleChange={(v) => set('seoTitle', v)}
                  slug={f.slug} onSlugChange={(v) => set('slug', typingSlug(v))}
                  keyword={f.focusKeyword} onKeywordChange={(v) => set('focusKeyword', v)}
                  indexable={f.robots === 'index'} onIndexableChange={(v) => set('robots', v ? 'index' : 'noindex')}
                  items={seo.items} score={seo.score} total={seo.total}
                />
              ),
            },
            { value: 'rev', label: t('adminBlog.editor.ui.revisions.label'), content: <Revisions postId={post.id} onRestore={restore} key={String(post.updatedAt)} /> },
          ]} />
        </aside>
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm} closeLabel={t('adminBlog.newPost.closeLabel')}
        title={primary === 'schedule' ? t('adminBlog.editor.ui.confirm.scheduleTitle') : t('adminBlog.editor.ui.confirm.publishTitle')}
        description={primary === 'schedule' ? t('adminBlog.editor.ui.confirm.scheduleBody', { date: scheduleIso ? formatBrasilia(scheduleIso) : '—' }) : t('adminBlog.editor.ui.confirm.publishBody')}>
        <div className="flex flex-col gap-4">
          <PublishBlockers title={t('adminBlog.editor.ui.confirm.blockers')} items={primary === 'schedule' && scheduleError ? [...missing, scheduleError] : missing} />
          <span className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirm(false)}>{t('adminBlog.editor.ui.confirm.back')}</Button>
            <Button size="sm" loading={busy} disabled={missing.length > 0 || (primary === 'schedule' && !!scheduleError)} onClick={() => void doPublish()}>
              {t(`adminBlog.editor.ui.primary.${primary}`)}
            </Button>
          </span>
        </div>
      </Dialog>
    </div>
  );
}

function Labeled({ id, label, aside, error, warn, children }: { id: string; label: string; aside?: string; error?: string; warn?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[15px] font-bold">{label}</label>
        {aside ? <span className={`text-[12.5px] ${warn ? 'font-bold text-review-text' : 'text-muted'}`}>{aside}</span> : null}
      </span>
      {children}
      {error ? <span className="text-[12.5px] font-semibold text-review-text">{error}</span> : null}
    </div>
  );
}

function Revisions({ postId, onRestore }: { postId: string; onRestore: (r: BlogRevision) => Promise<void> }) {
  const [list, setList] = useState<BlogRevision[] | null>(null);
  useEffect(() => { void listRevisions(postId).then((r) => setList(r.ok ? r.data : [])); }, [postId]);
  if (!list) return null;
  if (!list.length) return <p className="m-0 p-1 text-sm text-muted">{t('adminBlog.editor.ui.revisions.empty')}</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {list.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 rounded-[12px] px-2 py-1.5">
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">{r.title}</span>
            <span className="text-[12.5px] text-muted">{formatBrasilia(r.createdAt)}{r.createdBy?.name ? ` · ${r.createdBy.name}` : ''}</span>
          </span>
          <Button variant="secondary" size="sm" onClick={() => void onRestore(r)}>{t('adminBlog.editor.ui.revisions.restore')}</Button>
        </li>
      ))}
    </ul>
  );
}
