'use client';

import { useState, type ReactNode } from 'react';
import * as RA from '@radix-ui/react-avatar';

/** Cores de avatar (índice 0–4): --primary, --primary-deep, --navy, --avatar-3, --avatar-4. */
export const AVATAR_COLORS = ['bg-primary text-on-primary', 'bg-primary-deep text-on-primary', 'bg-navy text-white', 'bg-avatar-3 text-white', 'bg-avatar-4 text-white'] as const;

/**
 * Avatar redondo: foto (`src`) ou iniciais (`fallback`). `name` = alt/rótulo.
 * `size` em px (padrão 44; a conta usa 108 e 48); `color` 0–4 (padrão 2, navy); `plain` tira o anel de borda.
 * Com `src`, mostra um anel girando enquanto a foto carrega; se ela falhar, as iniciais.
 */
export type AvatarProps = { name: string; fallback: ReactNode; src?: string; size?: number; color?: number; plain?: boolean };

export function Avatar({ name, fallback, src, size = 44, color = 2, plain = false }: AvatarProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const loading = !!src && (status === 'idle' || status === 'loading');
  const tone = AVATAR_COLORS[Math.min(4, Math.max(0, Math.trunc(color)))] ?? AVATAR_COLORS[2];
  return (
    <RA.Root
      style={{ width: size, height: size }}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill font-display font-bold ${tone} ${plain ? '' : 'ring-2 ring-border'}`}
    >
      {src ? <RA.Image src={src} alt={name} onLoadingStatusChange={setStatus} className="h-full w-full object-cover" /> : null}
      <RA.Fallback aria-label={name} aria-busy={loading || undefined} role="img" style={{ fontSize: Math.max(12, Math.round(size * 0.35)) }} className="font-bold">
        {loading ? <span data-testid="avatar-loading" className="block size-1/2 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80 motion-reduce:animate-none" /> : fallback}
      </RA.Fallback>
    </RA.Root>
  );
}
