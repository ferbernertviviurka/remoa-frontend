'use client';

// F17 T7 (FR-13, FR-15): shared board view — disclaimer, canvas, CTA.
// D-325: `?copiar=1` auto-copy on return from login is handled via useEffect.
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SharedBoard } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button } from '@remoa/ui';
import { track, trackWhenIdle } from '@/lib/analytics';
import { usePaywall } from '@/features/billing/paywall';
import { copyBoardAction } from './actions';

const t = withStrings({ boards: more.boards, sharedMap: more.sharedMap });

const SharedCanvas = dynamic(
  () => import('./shared-canvas').then((m) => m.SharedCanvas),
  { ssr: false, loading: () => <div className="flex-1 bg-canvas animate-pulse" aria-busy="true" /> },
);

type Props = {
  board: SharedBoard;
  token: string;
};

/** FR-13: faixa fixa (rule 6 — always visible at top). */
function Disclaimer() {
  return (
    <div
      className="sticky top-0 z-10 flex min-h-[44px] items-center justify-center bg-review-bg px-4 py-2.5 text-center text-sm font-semibold text-review-text"
      role="note"
      data-testid="shared-board-disclaimer"
    >
      {t('sharedMap.disclaimer')}
    </div>
  );
}

const INTENT_KEY = 'remoa-copy-intent';
/** Reads the pending copy intent, or sets/clears it (sessionStorage: this tab only). */
function copyIntent(set?: string | null): string | null {
  try {
    if (set === undefined) return sessionStorage.getItem(INTENT_KEY);
    if (set) sessionStorage.setItem(INTENT_KEY, set);
    else sessionStorage.removeItem(INTENT_KEY);
  } catch {
    /* private mode: no auto-copy, the button still works */
  }
  return null;
}

export function SharedBoardView({ board, token }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paywall = usePaywall();
  const [copying, setCopying] = useState(false);
  const [isPending, startTransition] = useTransition();
  const didAutoCopy = useRef(false);

  // Track view
  useEffect(() => {
    trackWhenIdle('shared_board_viewed', { access: board.access, cards: board.cardCount });
  }, [board.access, board.cardCount]);

  // FR-15: if `?copiar=1` is present (returning from login), auto-copy once
  useEffect(() => {
    // D-544: only the tab that clicked "Copiar" before the login copies on return; a `?copiar=1` link from someone else does not.
    if (searchParams.get('copiar') === '1' && !didAutoCopy.current && copyIntent() === token) {
      didAutoCopy.current = true;
      void handleCopy();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCopy() {
    setCopying(true);
    copyIntent(token);
    startTransition(async () => {
      const result = await copyBoardAction(token); // no session: redirects to the login and the intent survives
      copyIntent(null);
      setCopying(false);
      if (!result.ok) {
        if (result.error === 'quota_exceeded') {
          track('board_copied_from_link', { access: board.access, cards: board.cardCount, blockedByQuota: true });
          paywall.show('boards');
          return;
        }
        if (result.error === 'forbidden') {
          // Private board: cookie expired or invalid — refresh to see the unlock form
          router.refresh();
          return;
        }
        // not_found or unknown: stay on page (link expired)
        return;
      }
      track('board_copied_from_link', { access: board.access, cards: board.cardCount, blockedByQuota: false });
      router.push(`/app/mapas/${result.boardId}`);
    });
  }

  const isCopying = copying || isPending;

  return (
    <div className="flex min-h-screen flex-col">
      <Disclaimer />

      {/* Board header */}
      <header className="flex flex-col gap-1 border-b border-border bg-surface px-5 py-4" data-testid="shared-board-header">
        <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">
          {t(`boards.area.${board.area}`)}
        </span>
        <div className="flex items-center justify-between gap-4">
          <h1 className="m-0 font-display text-[22px] font-extrabold tracking-[-0.025em] text-ink">
            {board.title}
          </h1>
          <span className="shrink-0 text-sm text-muted" aria-label={t('sharedMap.cardCount', { n: board.cardCount })}>
            {t('sharedMap.cardCount', { n: board.cardCount })}
          </span>
        </div>
        {board.matrixItems.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {board.matrixItems.map((item) => (
              <span
                key={item.code}
                className="rounded-full bg-primary-tint px-2.5 py-0.5 text-xs font-bold text-primary-deep"
              >
                {item.code} {item.title}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {/* Read-only canvas */}
      <div className="relative flex-1" style={{ minHeight: 400 }}>
        <SharedCanvas board={board} />
      </div>

      {/* CTA footer */}
      <footer className="sticky bottom-0 flex items-center justify-center gap-3 border-t border-border bg-surface px-5 py-4">
        <Button
          onClick={() => void handleCopy()}
          aria-busy={isCopying}
          data-testid="copy-cta"
        >
          {isCopying ? t('sharedMap.copying') : t('sharedMap.copyCta')}
        </Button>
        {/* FR-15: also show "Criar meu mapa" for logged-out users (shown alongside) */}
        <a
          href="/cadastro"
          className="text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          data-testid="create-cta"
        >
          {t('sharedMap.createCta')}
        </a>
      </footer>
    </div>
  );
}
