'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ComponentProps, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeSkeleton, BoardsSkeleton, EditorSkeleton, PageSkeleton, ReviewSkeleton, SeedDetailSkeleton } from './skeletons';

/**
 * Destino de um clique ainda não commitado (trilho, barra inferior, logo, avatar, MapTile). Vale só enquanto a rota for a do
 * clique (derivado no render: a rota nova nunca pisca o esqueleto por um frame); limpa ao mudar a rota ou após 10 s (navegação
 * cancelada/falha). Clicar no destino em que já se está não marca nada.
 */
type Pending = { href: string; from: string };
const Ctx = createContext<{ pending: string | null; setPending: (href: string) => void }>({ pending: null, setPending: () => {} });
export const useNavPending = () => useContext(Ctx);

export function NavPendingProvider({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [state, setState] = useState<Pending | null>(null);
  useEffect(() => setState(null), [path]);
  useEffect(() => {
    if (!state) return;
    const id = setTimeout(() => setState(null), 10_000);
    return () => clearTimeout(id);
  }, [state]);
  const pending = state && state.from === path ? state.href : null;
  const value = useMemo(
    () => ({
      pending,
      setPending: (href: string) => {
        const to = href.split(/[?#]/)[0]!;
        setState(to === path ? null : { href: to, from: path });
      },
    }),
    [pending, path],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const skeletons: Record<string, () => ReactNode> = { '/app/hoje': HomeSkeleton, '/app/mapas': BoardsSkeleton, '/app/revisar': ReviewSkeleton };
/** G02: a map opened from a MapTile (Hoje, Meus mapas) shows the editor skeleton on the click; any other route the generic one. */
const skeletonOf = (href: string) =>
  skeletons[href]
  ?? (/^\/app\/mapas\/prontos\/[0-9a-f-]{36}$/i.test(href) ? SeedDetailSkeleton : /^\/app\/mapas\/[0-9a-f-]{36}$/i.test(href) ? EditorSkeleton : PageSkeleton);

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

/** Enquanto um clique espera a rota, mostra o esqueleto do destino no lugar da página antiga; sem Suspense, então o conteúdo real entra sem o throttle de 300 ms do React. */
export function MainSlot({ children }: { children: ReactNode }) {
  const { pending } = useNavPending();
  const Skeleton = pending ? skeletonOf(pending) : undefined;
  return <>{Skeleton ? <Skeleton /> : children}</>;
}
