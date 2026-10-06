'use client';

// F27 T7: picking + uploading one image (cover and image block). Client pre-check mirrors the API (PNG/JPEG/WebP ≤ 5 MB); the API re-checks by signature.
import { useRef, useState } from 'react';
import { BLOG_LIMITS, type BlogAsset } from '@remoa/contracts';
import { t } from '@remoa/strings/admin';
import { Button, Icon } from '@remoa/ui';
import { uploadBlogImage } from './upload';

const TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function ImageUpload({ slug, label, onUploaded }: { slug: string; label: string; onUploaded: (asset: BlogAsset) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState('');

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (!TYPES.includes(file.type) || file.size > BLOG_LIMITS.imageMaxBytes) return setError(t('adminBlog.editor.ui.cover.badImage'));
    setPct(0);
    const r = await uploadBlogImage(file, slug, setPct);
    setPct(null);
    if (r.ok) onUploaded(r.asset);
    else setError(t(r.code === 'bad_image' ? 'adminBlog.editor.ui.cover.badImage' : 'adminBlog.editor.ui.cover.uploadError'));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <input ref={input} type="file" accept={TYPES.join(',')} hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
      <span className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" icon={<Icon name="upload" size={18} />} loading={pct !== null} onClick={() => input.current?.click()}>{label}</Button>
        {pct !== null ? (
          <span role="progressbar" aria-label={t('adminBlog.editor.ui.cover.uploading', { pct })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="flex items-center gap-2 text-[13px] text-muted">
            <span className="block h-1.5 w-28 overflow-hidden rounded bg-divider"><span className="block h-1.5 rounded bg-primary transition-[width] duration-200" style={{ width: `${pct}%` }} /></span>
            {t('adminBlog.editor.ui.cover.uploading', { pct })}
          </span>
        ) : null}
      </span>
      {error ? <span role="alert" className="text-[12.5px] font-semibold text-review-text">{error}</span> : null}
    </div>
  );
}
