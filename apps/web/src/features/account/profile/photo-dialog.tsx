'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AvatarVariants } from '@remoa/contracts';
import { AVATAR_COLOR_COUNT } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Avatar, AvatarCropper, Button, Dialog, Dropzone, Icon, focusRing, useToast, validateAvatarFile, type AvatarCropperHandle } from '@remoa/ui';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { putFile } from '@/features/cards/upload';
import { useAccount } from '../shell/account-context';
import { initialsOf } from '../shell/format';
import { useOnline } from '../shell/use-online';

const PhotoCtx = createContext<{ open: () => void } | null>(null);

export function usePhotoDialog() {
  const v = useContext(PhotoCtx);
  if (!v) throw new Error('usePhotoDialog outside PhotoDialogProvider');
  return v;
}

/** One photo dialog for the hero avatar, the "Foto" row and the "Adicionar foto" chip. Radix returns focus to the opener on close. */
export function PhotoDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <PhotoCtx.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen} title={t('account.photoDialog.title')} closeLabel={t('account.photoDialog.closeLabel')} size="xl">
        {open ? <PhotoForm onClose={() => setOpen(false)} /> : null}
      </Dialog>
    </PhotoCtx.Provider>
  );
}

const colorKeys = ['brand', 'deep', 'navy', 'graphite', 'violet'] as const;

function PhotoForm({ onClose }: { onClose: () => void }) {
  const { account, setAccount } = useAccount();
  const router = useRouter();
  const { toast } = useToast();
  const online = useOnline();
  const root = useRef<HTMLDivElement>(null);
  const cropper = useRef<AvatarCropperHandle>(null);
  const [file, setFile] = useState<{ file: File; url: string } | null>(null);
  const [color, setColor] = useState(account.profile.avatarColor);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const urlRef = useRef<string | null>(null);
  useEffect(() => () => void (urlRef.current && URL.revokeObjectURL(urlRef.current)), []);

  const hasPhoto = !!account.profile.avatarKey;
  const dirty = !!file || removed || color !== account.profile.avatarColor;
  const name = account.profile.name;

  function pick(files: FileList) {
    const f = files[0];
    if (!f) return;
    const check = validateAvatarFile(f);
    if (!check.ok) return setError(t(check.reason === 'type' ? 'account.photoDialog.errorType' : 'account.photoDialog.errorSize'));
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(f);
    urlRef.current = url;
    setError(null);
    setRemoved(false);
    setFile({ file: f, url });
  }

  async function save() {
    setBusy(true);
    const prev = { key: account.profile.avatarKey, color: account.profile.avatarColor, urls: account.avatarUrls };
    const colorChanged = color !== prev.color;
    const zoom = Number(root.current?.querySelector<HTMLInputElement>('input[type="range"]')?.value ?? NaN);
    let blob: Blob | null = null;
    if (file) {
      blob = (await cropper.current?.exportBlob()) ?? null;
      if (!blob) {
        setBusy(false);
        return setError(t('account.photoDialog.errorUpload'));
      }
    }
    const preview = blob ? URL.createObjectURL(blob) : null;
    // Optimistic: the hero, the row and (later) the rail change at once; any failure puts the previous values back.
    setAccount((p) => ({
      ...p,
      profile: { ...p.profile, avatarColor: color, avatarKey: blob ? 'pending' : removed ? null : p.profile.avatarKey },
      avatarUrls: preview ? { large: preview, small: preview } : removed ? null : p.avatarUrls,
    }));
    onClose();
    try {
      if (blob) {
        const upload = new File([blob], 'avatar.webp', { type: 'image/webp' });
        const sign = await api<{ url: string; key: string }>('/v1/uploads/sign', {
          method: 'POST',
          body: JSON.stringify({ kind: 'avatar', mime: upload.type, sizeBytes: upload.size }),
        });
        if (!sign.ok) throw new Error(sign.error.code);
        if (!(await putFile(sign.data.url, upload, () => undefined))) throw new Error('put');
        const done = await api<AvatarVariants>('/v1/account/avatar', { method: 'POST', body: JSON.stringify({ key: sign.data.key }) });
        if (!done.ok) throw new Error(done.error.code);
        setAccount((p) => ({ ...p, profile: { ...p.profile, avatarKey: sign.data.key }, avatarUrls: done.data }));
      } else if (removed) {
        const r = await api('/v1/account/avatar', { method: 'DELETE' });
        if (!r.ok) throw new Error(r.error.code);
      }
      if (colorChanged) {
        const r = await api('/v1/account/profile', { method: 'PATCH', body: JSON.stringify({ avatarColor: color }) });
        if (!r.ok) throw new Error(r.error.code);
      }
      track('avatar_changed', { source: blob ? 'upload' : removed ? 'removed' : 'initials', zoom: blob && Number.isFinite(zoom) ? Math.min(200, Math.max(100, zoom)) : null });
      router.refresh(); // the rail avatar is rendered by the server shell, outside AccountProvider
      toast({ title: t(blob ? 'account.photoDialog.savedPhoto' : removed ? 'account.photoDialog.removed' : 'account.photoDialog.savedAvatar') });
    } catch {
      setAccount((p) => ({ ...p, profile: { ...p.profile, avatarKey: prev.key, avatarColor: prev.color }, avatarUrls: prev.urls }));
      toast({ title: t('account.photoDialog.errorUpload'), tone: 'danger' });
    }
  }

  return (
    <div ref={root} className="flex flex-col gap-[22px]">
      <div className="grid gap-7 md:grid-cols-[280px_minmax(0,1fr)]">
        {file ? (
          <AvatarCropper ref={cropper} src={file.url} areaLabel={t('account.photoDialog.title')} zoomLabel={t('account.photoDialog.zoom')} onChange={() => undefined} />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <span className="block rounded-pill border-2 border-dashed border-border-strong p-2">
              <Avatar name={name ?? t('account.hero.noName')} fallback={initialsOf(name, account.email)} src={removed ? undefined : account.avatarUrls?.large} size={240} color={color} plain />
            </span>
            <label className="flex w-full flex-col gap-1.5 text-sm font-bold opacity-50">
              <span className="flex justify-between">
                <span>{t('account.photoDialog.zoom')}</span>
                <span className="text-muted">100%</span>
              </span>
              <input type="range" disabled min={100} max={200} step={5} defaultValue={100} className="h-8 w-full accent-[var(--primary)]" />
            </label>
          </div>
        )}
        <div className="flex flex-col gap-[18px]">
          <Dropzone compact title={t('account.photoDialog.drop')} description={t('account.photoDialog.help')} buttonLabel={t('account.photoDialog.choose')} accept="image/jpeg,image/png,image/webp" onFiles={pick} />
          {error ? (
            <p role="alert" className="m-0 text-sm font-semibold text-review-text">
              {error}
            </p>
          ) : null}
          <div role="group" aria-label={t('account.photoDialog.colorLabel')} className="flex flex-col gap-2.5">
            <span className="font-bold">{t('account.photoDialog.initials')}</span>
            <span className="flex gap-2.5">
              {Array.from({ length: AVATAR_COLOR_COUNT }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={color === i}
                  aria-label={t(`account.photoDialog.colors.${colorKeys[i]!}`)}
                  onClick={() => setColor(i)}
                  className={`flex size-12 items-center justify-center rounded-pill transition-shadow duration-200 ${color === i ? 'shadow-[0_0_0_3px_var(--surface),0_0_0_5px_var(--primary)]' : ''} ${focusRing}`}
                >
                  <Avatar name={t(`account.photoDialog.colors.${colorKeys[i]!}`)} fallback={color === i ? <Icon name="check" size={20} /> : ''} size={48} color={i} plain />
                </button>
              ))}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-1.5">
        <button
          type="button"
          disabled={!hasPhoto || removed || !!file}
          onClick={() => {
            setRemoved(true);
            setError(null);
          }}
          className={`h-12 px-1.5 font-bold text-review-text disabled:opacity-50 ${focusRing} rounded-[8px]`}
        >
          {t('account.photoDialog.remove')}
        </button>
        <span className="flex gap-2.5">
          <Button variant="secondary" onClick={onClose}>
            {t('account.photoDialog.cancel')}
          </Button>
          <Button disabled={!dirty || !online || busy} onClick={save}>
            {t('account.photoDialog.save')}
          </Button>
        </span>
      </div>
    </div>
  );
}
