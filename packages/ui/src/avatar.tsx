'use client';

import * as RA from '@radix-ui/react-avatar';

/** Avatar 36px (navy). `name` = alt/rótulo; `fallback` = iniciais; `src` opcional. */
export type AvatarProps = { name: string; fallback: string; src?: string };

export function Avatar({ name, fallback, src }: AvatarProps) {
  return (
    <RA.Root className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-pill bg-navy text-white">
      {src ? <RA.Image src={src} alt={name} className="h-full w-full object-cover" /> : null}
      <RA.Fallback aria-label={name} role="img" className="text-xs font-bold">{fallback}</RA.Fallback>
    </RA.Root>
  );
}
