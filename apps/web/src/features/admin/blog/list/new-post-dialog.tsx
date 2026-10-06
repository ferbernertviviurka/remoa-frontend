'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BLOG_LIMITS, blogTemplates, type BlogTemplate } from '@remoa/contracts';
import { t } from '@remoa/strings/admin';
import { Button, Dialog, Input, TemplatePicker } from '@remoa/ui';
import { blogAction } from '../api';

const options = blogTemplates.map((value) => ({ value, name: t(`adminBlog.newPost.templates.${value}.name`), description: t(`adminBlog.newPost.templates.${value}.description`) }));

/** FR-4: título (≥ 10) + template; "Criar e abrir o editor" só liga com título válido. */
export function NewPostDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState<BlogTemplate>('leitura');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const valid = title.trim().length >= BLOG_LIMITS.titleMin;

  async function create() {
    setBusy(true); setError(false);
    const r = await blogAction<{ post: { id: string } }>('/posts', { title: title.trim(), template });
    if (!r.ok) { setBusy(false); setError(true); return; }
    router.push(`/admin/blog/${r.data.post.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="xl" title={t('adminBlog.newPost.title')} closeLabel={t('adminBlog.newPost.closeLabel')}>
      <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); if (valid && !busy) void create(); }}>
        <Input label={t('adminBlog.newPost.titleLabel')} placeholder={t('adminBlog.newPost.titlePlaceholder')} value={title} maxLength={BLOG_LIMITS.titleMax} onChange={(e) => setTitle(e.target.value)} aria-describedby="new-post-hint" autoFocus />
        <span id="new-post-hint" className="-mt-3 text-[13px] text-muted">{t('adminBlog.newPost.titleHint')}</span>
        <TemplatePicker label={t('adminBlog.newPost.templateLabel')} value={template} onChange={setTemplate} options={options} />
        <p className="m-0 text-[13.5px] text-muted">{t('adminBlog.newPost.templateHint')}</p>
        {error ? <p role="alert" className="m-0 text-[13px] font-semibold text-review-text">{t('adminBlog.newPost.createError')}</p> : null}
        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>{t('adminBlog.newPost.cancel')}</Button>
          <Button type="submit" disabled={!valid} loading={busy}>{t('adminBlog.newPost.createButton')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
