'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BLOG_LIMITS, slugify, type BlogCategory } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, Dialog, Input, Textarea, useToast } from '@remoa/ui';
import { blogAction } from '../api';

const INTRO_MIN = 150;
const INTRO_MAX = 300;
export const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const catPath = (slug: string) => `/blog/categoria/${slug}`;
const preview = (s: string) => (s.length > 90 ? `${s.slice(0, 90)}…` : s);

const input = (c: BlogCategory, over: Partial<{ name: string; slug: string; intro: string; introDraft: boolean; position: number }> = {}) => ({
  id: c.id, name: c.name, slug: c.slug, intro: c.intro, introDraft: c.introDraft, position: c.position, ...over,
});

/** FR-14: criar, renomear e ordenar categorias. Intro de 150 a 300 palavras; fora disso fica como rascunho (a página pública a esconde, D-911). */
export function CategoriesSection({ categories }: { categories: BlogCategory[] | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState<BlogCategory | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const sorted = [...(categories ?? [])].sort((a, b) => a.position - b.position);

  async function move(i: number, dir: -1 | 1) {
    const a = sorted[i]!, b = sorted[i + dir]!;
    setBusy(true);
    const [r1, r2] = await Promise.all([
      blogAction('/categories', input(a, { position: b.position })),
      blogAction('/categories', input(b, { position: a.position })),
    ]);
    setBusy(false);
    if (!r1.ok || !r2.ok) return toast({ title: t('adminBlog.categories.saveError'), tone: 'danger' });
    router.refresh();
  }

  return (
    <section aria-labelledby="blog-categories" className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="blog-categories" className="m-0 font-display text-[22px] font-extrabold">{t('adminBlog.categories.label')}</h2>
        <Button variant="secondary" onClick={() => setEditing('new')}>{t('adminBlog.categories.add')}</Button>
      </div>
      {categories === null ? <p role="alert" className="m-0 text-[13.5px] font-semibold text-review-text">{t('adminBlog.categories.loadError')}</p> : (
        <ul aria-label={t('adminBlog.categories.ariaLabel')} className="m-0 flex list-none flex-col overflow-hidden rounded-list border border-border bg-surface p-0">
          {sorted.length === 0 ? <li className="px-5 py-8 text-center text-muted">{t('adminBlog.categories.empty')}</li> : null}
          {sorted.map((c, i) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-divider px-5 py-3 first:border-t-0">
              <span className="min-w-[180px] flex-1">
                <span className="block font-bold">{c.name}</span>
                <span className="block font-mono text-xs text-muted">{catPath(c.slug)}</span>
              </span>
              <span className="text-[13.5px] text-muted"><span className="sr-only">{t('adminBlog.categories.columns.position')}: </span>{i + 1}</span>
              <span className="min-w-[200px] flex-[2] text-[13.5px] text-muted">{c.intro && !c.introDraft ? preview(c.intro) : t('adminBlog.categories.introPending')}</span>
              <span className="flex gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => setEditing(c)}>{`${t('adminBlog.categories.edit')}`}<span className="sr-only"> {c.name}</span></Button>
                <Button variant="secondary" size="sm" disabled={busy || i === 0} aria-label={`${t('adminBlog.categories.moveUp')}: ${c.name}`} onClick={() => void move(i, -1)}>{t('adminBlog.categories.moveUp')}</Button>
                <Button variant="secondary" size="sm" disabled={busy || i === sorted.length - 1} aria-label={`${t('adminBlog.categories.moveDown')}: ${c.name}`} onClick={() => void move(i, 1)}>{t('adminBlog.categories.moveDown')}</Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {editing ? <CategoryDialog key={editing === 'new' ? 'new' : editing.id} category={editing === 'new' ? null : editing} nextPosition={sorted.length} onClose={() => setEditing(null)} /> : null}
    </section>
  );
}

function CategoryDialog({ category, nextPosition, onClose }: { category: BlogCategory | null; nextPosition: number; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [touchedSlug, setTouchedSlug] = useState(!!category);
  const [intro, setIntro] = useState(category?.intro ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const words = countWords(intro);
  const valid = name.trim().length >= 2 && slug.length > 0;

  async function save() {
    setBusy(true); setError(false);
    const r = await blogAction('/categories', {
      ...(category ? { id: category.id } : {}), name: name.trim(), slug, intro: intro.trim(),
      introDraft: words < INTRO_MIN || words > INTRO_MAX, position: category?.position ?? nextPosition,
    });
    setBusy(false);
    if (!r.ok) return setError(true);
    toast({ title: t('adminBlog.categories.saved') });
    router.refresh();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} size="lg" title={t(category ? 'adminBlog.categories.editTitle' : 'adminBlog.categories.newTitle')} closeLabel={t('adminBlog.categories.closeLabel')}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (valid && !busy) void save(); }}>
        <Input label={t('adminBlog.categories.nameLabel')} value={name} maxLength={BLOG_LIMITS.categoryNameMax} onChange={(e) => { setName(e.target.value); if (!touchedSlug) setSlug(slugify(e.target.value)); }} />
        <Input label={t('adminBlog.categories.slugLabel')} value={slug} maxLength={BLOG_LIMITS.slugMax} onChange={(e) => { setTouchedSlug(true); setSlug(slugify(e.target.value)); }} />
        <Textarea label={t('adminBlog.categories.introLabel')} rows={6} value={intro} onChange={(e) => setIntro(e.target.value)} />
        <p aria-live="polite" className={`m-0 text-[13px] ${words >= INTRO_MIN && words <= INTRO_MAX ? 'font-semibold text-ok' : 'text-muted'}`}>{t('adminBlog.categories.words', { count: words })}</p>
        {error ? <p role="alert" className="m-0 text-[13px] font-semibold text-review-text">{t('adminBlog.categories.saveError')}</p> : null}
        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={onClose}>{t('adminBlog.categories.cancel')}</Button>
          <Button type="submit" disabled={!valid} loading={busy}>{t('adminBlog.categories.save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
