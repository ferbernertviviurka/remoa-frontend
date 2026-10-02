'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ComponentProps, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeSkeleton, BoardsSkeleton, EditorSkeleton, ReviewSkeleton } from './skeletons';

/** Destino de um clique no trilho ainda não commitado. Só o trilho escreve; limpa ao mudar a rota ou após 10 s (navegação cancelada/falha). */
const Ctx = createContext<{ pending: string | null; setPending: (href: string) => void }>({ pending: null, setPending: () => {} });
export const useNavPending = () => useContext(Ctx);

export function NavPendingProvider({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => setPending(null), [path]);
  useEffect(() => {
    if (!pending) return;
    const id = setTimeout(() => setPending(null), 10_000);
    return () => clearTimeout(id);
  }, [pending]);
  const value = useMemo(() => ({ pending, setPending }), [pending]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const skeletons: Record<string, () => ReactNode> = { '/': HomeSkeleton, '/mapas': BoardsSkeleton, '/revisar': ReviewSkeleton };
/** G02: a map opened from a MapTile (Hoje, Meus mapas) shows the editor skeleton on the click, before the route answers. */
const skeletonOf = (href: string) => skeletons[href] ?? (/^\/mapas\/[0-9a-f-]{36}$/.test(href) ? EditorSkeleton : undefined);

/** next/link that marks its destination as pending on a plain click (MapTile `as`), so `MainSlot` swaps in its skeleton at once. */
export function PendingLink({ onClick, ...p }: ComponentProps<typeof Link>) {
  const { setPending } = useNavPending();
  return (
    <Link
      {...p}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        // new tab / window: nothing changes here
        if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && typeof p.href === 'string') setPending(p.href);
      }}
    />
  );
}

/** Enquanto um clique no trilho espera a rota, mostra o esqueleto do destino no lugar da página antiga; sem Suspense, então o conteúdo real entra sem o throttle de 300 ms do React. */
export function MainSlot({ children }: { children: ReactNode }) {
  const { pending } = useNavPending();
  const path = usePathname();
  const same = pending === '/' ? path === '/' || path === '/hoje' : pending != null && (path === pending || path.startsWith(`${pending}/`));
  const Skeleton = pending && !same ? skeletonOf(pending) : undefined;
  return <>{Skeleton ? <Skeleton /> : children}</>;
}
