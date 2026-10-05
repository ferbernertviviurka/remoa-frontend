'use client';

import { useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * router.push/replace/refresh dentro de uma transição: `navigating` só volta a false quando a rota nova já renderizou.
 * Sem isso, `setBusy(false)` no `finally` apaga o spinner antes da navegação e a tela parece travada.
 * Uso: `loading={busy || navigating}`.
 */
export function useNavigate() {
  const router = useRouter();
  const [navigating, start] = useTransition();
  const navigate = useMemo(
    () => ({
      push: (...a: Parameters<AppRouterInstance['push']>) => start(() => router.push(...a)),
      replace: (...a: Parameters<AppRouterInstance['replace']>) => start(() => router.replace(...a)),
      refresh: () => start(() => router.refresh()),
    }),
    [router],
  );
  return [navigating, navigate] as const;
}
