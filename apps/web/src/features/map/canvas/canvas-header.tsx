'use client';

import { memo, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Board } from '@remoa/contracts';
import { boardTitleSchema } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { CHALLENGE_MIN_CARDS } from '@remoa/contracts';
import { Alert, Button, Icon, InlineTitle, Menu, Segmented, Tooltip, useToast } from '@remoa/ui';
import { openChallengeTour } from '@/features/challenge/tour';
import { api } from '@/lib/api';
// F17 T7: ShareDialog (FR-12) — loaded only when the board is private and not a seed.
import { MapPropertiesDialog } from '@/features/map/properties/map-properties-dialog';
import { ShareDialog } from '@/features/map/share/share-dialog';
import type { QueueStatus } from './op-queue';
import { saveText } from './save-text';

const t = withStrings({ boards: more.boards, map: more.map, mapProps: more.mapProps, share: more.share });
type StringKey = Parameters<typeof t>[0];

export { saveText };

export type Mode = 'explore' | 'challenge';

function useNow(everyMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

type Props = {
  board: Board;
  status: QueueStatus;
  onRetry: () => void;
  mode: Mode;
  onMode: (m: Mode) => void;
  /** D-579: challengeable cards still missing (> 0 = "Desafiar este mapa" blocked, with the reason in a tooltip). */
  missing: number;
  /** F07 FR-5: "cobre X% de <item>", link to /cobertura. */
  coverage: { pct: number; item: string } | null;
  /** Cards due today: the CTA reads "Desafiar os N que vencem hoje" (D-098: it was the map panel's button). */
  due: number;
};

const dots = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <circle cx="3.5" cy="8" r="1.4" /><circle cx="8" cy="8" r="1.4" /><circle cx="12.5" cy="8" r="1.4" />
  </svg>
);


/** Editor.dc.html header (68 px): back, area + inline title, "Salvo há", Explorar/Desafio, "Desafiar este mapa". ⌘K moved to the app navbar (D-607). */
export const CanvasHeader = memo(function CanvasHeader(p: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const saved = useRef(p.board.title);
  const [title, setTitle] = useState(p.board.title);
  const now = useNow(30_000);
  // F17 T7 (FR-12): share dialog state — only for owner boards (status=private, not seed/archived).
  const [shareOpen, setShareOpen] = useState(false);
  const [propsOpen, setPropsOpen] = useState(false);
  const canShare = p.board.status === 'private' && !p.board.archivedAt;

  async function save(input: string) {
    const next = boardTitleSchema.safeParse(input);
    if (!next.success || next.data === saved.current) return;
    setTitle(next.data); // optimistic
    const revert = (key: StringKey) => {
      setTitle(saved.current);
      toast({ title: t(key), tone: 'danger' });
    };
    try {
      const r = await api<Board>(`/v1/boards/${p.board.id}`, { method: 'PATCH', body: JSON.stringify({ title: next.data }) });
      if (!r.ok) return revert(`errors.${r.error.code}` as StringKey);
      saved.current = r.data.title;
      setTitle(r.data.title);
      router.refresh(); // rail + Meus mapas
    } catch {
      revert('errors.internal');
    }
  }

  const failed = p.status.state === 'error';
  const challengeText = p.due > 0 ? t('quiz.challengeBoard', { n: p.due }) : t('vocab.challengeBoard');
  const blocked = p.missing > 0;
  const reason = p.missing === 1 ? t('challengeSetup.minCards.tooltipOne', { min: CHALLENGE_MIN_CARDS }) : t('challengeSetup.minCards.tooltip', { min: CHALLENGE_MIN_CARDS, n: p.missing });
  const [tip, setTip] = useState(false);
  const reasonId = `challenge-blocked-${p.board.id}`;
  const modes = [
    { value: 'explore', label: t('editor.explore') },
    { value: 'challenge', label: t('editor.challenge'), disabled: blocked, describedBy: blocked ? reasonId : undefined },
  ];
  const tourItem = { label: t('challengeSetup.tour.replay'), onSelect: openChallengeTour };
  return (
    <>
      {/* phone (G02): back, truncated title, Explorar/Desafio and the rest in a "⋯" menu */}
      <header className="flex h-[68px] shrink-0 items-center gap-2 border-b border-border bg-surface px-3 md:gap-3.5 md:px-5">
        <Link
          href="/app/mapas"
          aria-label={t('editor.backToLibrary')}
          className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-border text-ink no-underline hover:bg-primary-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Icon name="left" size={20} aria-hidden="true" />
        </Link>
        {/* InlineTitle is 28 px in Torph; the mock header uses 23 px (design-system follow-up: a `size` prop). */}
        <div className="flex min-w-0 flex-1 flex-col leading-[1.2] md:flex-none [&_button]:max-w-full [&_button]:py-0 [&_h1]:truncate [&_h1]:text-[18px] [&_h1]:leading-[1.2] [&_h1]:tracking-[-.025em] [&_input]:text-[18px] [&_input]:leading-[1.2] md:[&_h1]:text-[23px] md:[&_input]:text-[23px]">
          <span className="truncate text-xs font-bold uppercase tracking-[.12em] text-muted">{t(`boards.area.${p.board.area}`)}</span>
          <InlineTitle value={title} inputLabel={t('map.titleLabel')} editHint={t('map.titleEdit')} maxLength={120} onSave={(v) => void save(v)} />
        </div>
        <span role="status" className="ml-1.5 hidden shrink-0 items-center gap-[7px] text-[13px] text-muted md:flex">
          <span aria-hidden="true" className={`block size-2 rounded-full ${failed || p.status.state === 'offline' ? 'bg-review' : 'bg-primary'}`} />
          {saveText(p.status, p.board.updatedAt, now)}
        </span>
        {p.coverage ? (
          <>
            {/* P-050b: full text from lg, compact chip md–lg, "⋯" menu item below md */}
            <Link href="/app/cobertura" className="hidden min-h-11 min-w-24 max-w-[22rem] shrink items-center truncate text-[13px] font-semibold text-primary-deep no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:inline-flex">
              {t('editor.coversHeader', { pct: p.coverage.pct, item: p.coverage.item })}
            </Link>
            <Link href="/app/cobertura" aria-label={t('editor.coversHeader', { pct: p.coverage.pct, item: p.coverage.item })} className="hidden min-h-11 shrink-0 items-center text-[13px] font-semibold text-primary-deep no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:inline-flex lg:hidden">
              {t('editor.coversShort', { pct: p.coverage.pct })}
            </Link>
          </>
        ) : null}
        <span id={reasonId} className="sr-only">{blocked ? reason : ''}</span>
        <span className="hidden grow md:block" />
        <span className="shrink-0 max-md:[&_button]:h-9 max-md:[&_button]:px-3 max-md:[&_button]:text-[13px]">
          <Segmented aria-label={t('map.toolbar.mode')} options={modes} value={p.mode} onValueChange={(v) => p.onMode(v as Mode)} />
        </span>
        <span className="hidden grow md:block" />
        <span className="hidden shrink-0 items-center gap-3.5 md:flex">
          {/* F17 T7 (FR-12): "Compartilhar" — only for private (student) boards, not seeds or archived. */}
          {canShare ? (
            <Button size="sm" variant="secondary" icon={<Icon name="link" size={18} />} onClick={() => setShareOpen(true)}>
              {t('share.headerButton')}
            </Button>
          ) : null}
          <Menu trigger="icon" align="end" icon={dots} label={t('editor.moreActions')} items={[...(canShare ? [{ label: t('mapProps.menu'), onSelect: () => setPropsOpen(true) }] : []), tourItem]} />
          {p.mode === 'explore' ? (
            blocked ? (
              // aria-disabled keeps it focusable: the tooltip explains on hover, focus and tap (G14 ponto 18)
              <Tooltip label={reason} open={tip} onOpenChange={setTip}>
                <Button size="sm" icon={<Icon name="bolt" size={18} />} aria-disabled="true" aria-describedby={reasonId} onClick={(e) => { e.preventDefault(); setTip(true); }}>
                  {challengeText}
                </Button>
              </Tooltip>
            ) : (
              <Button size="sm" icon={<Icon name="bolt" size={18} />} onClick={() => p.onMode('challenge')}>
                {challengeText}
              </Button>
            )
          ) : (
            <Button size="sm" variant="secondary" icon={<Icon name="close" size={18} />} onClick={() => p.onMode('explore')}>
              {t('quiz.exit')}
            </Button>
          )}
        </span>
        <span className="shrink-0 md:hidden">
          <Menu
            trigger="icon"
            align="end"
            icon={dots}
            label={t('editor.moreActions')}
            items={[
              ...(p.coverage ? [{ label: t('editor.coversMenu', { pct: p.coverage.pct, item: p.coverage.item }), onSelect: () => router.push('/app/cobertura') }] : []),
              ...(canShare ? [{ label: t('share.headerButton'), onSelect: () => setShareOpen(true) }, { label: t('mapProps.menu'), onSelect: () => setPropsOpen(true) }] : []),
              p.mode === 'explore' ? { label: blocked ? `${challengeText} · ${reason}` : challengeText, onSelect: () => (blocked ? undefined : p.onMode('challenge')) } : { label: t('quiz.exit'), onSelect: () => p.onMode('explore') },
              tourItem,
            ]}
          />
        </span>
      </header>
      {/* F17 T7 (FR-12): ShareDialog — mounted conditionally to avoid loading share state on every page load. */}
      {canShare ? (
        <>
          <ShareDialog board={p.board} open={shareOpen} onOpenChange={setShareOpen} />
          <MapPropertiesDialog board={p.board} open={propsOpen} onOpenChange={setPropsOpen} />
        </>
      ) : null}
      {failed ? (
        <div className="absolute inset-x-0 top-[68px] z-20 px-5 pt-3">
          <Alert tone="review" role="alert" title={t('map.save.error')}>
            <Button variant="secondary" onClick={p.onRetry}>
              {t('common.retry')}
            </Button>
          </Alert>
        </div>
      ) : null}
    </>
  );
});
