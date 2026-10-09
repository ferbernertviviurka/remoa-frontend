'use client';
import {useQuestionFeatureFlags,questionDestinationEnabled} from '@/features/questions/flags';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@remoa/strings';
import dynamic from 'next/dynamic';
import { Button, Icon, IconButton, Kbd, type CommandItem } from '@remoa/ui';
import { openChallengeTour } from '@/features/challenge/tour';
import { openSupport } from '@/features/support/open';

/** Commands a screen adds while mounted (the map: create, layers, cards…); `run` handles only its own ids. */
type Extra = { items: readonly CommandItem[]; run: (c: CommandItem) => void };
type Ctx = { open: () => void; setExtra: (e: Extra | null) => void };
const PaletteCtx = createContext<Ctx | null>(null);

const routes = { questions: '/app/banco-de-questoes', exams: '/app/provas', home: '/app/hoje', maps: '/app/mapas', newMap: '/app/mapas/novo', review: '/app/revisar', progress: '/app/progresso', account: '/app/conta' } as const;
const go = (k: keyof typeof routes, label: string, hint: string, group = t('palette.groups.goTo')): CommandItem => ({ id: `go:${k}`, group, label, hint });
const GLOBAL: CommandItem[] = [
  go('home', t('palette.home.label'), t('palette.home.hint')),
  go('maps', t('palette.maps.label'), t('palette.maps.hint')),
  go('newMap', t('palette.newMap.label'), t('palette.newMap.hint')),
  go('questions', t('questions.title'), t('questions.subtitle')),
  go('exams', t('questions.examsTitle'), t('questions.examsDescription')),
  go('review', t('palette.review.label'), t('palette.review.hint')),
  go('progress', t('challengeSetup.palette.progress.label'), t('challengeSetup.palette.progress.hint')),
  go('account', t('challengeSetup.palette.account.label'), t('challengeSetup.palette.account.hint'), t('challengeSetup.palette.groups.account')),
  { id: 'tour', group: t('palette.groups.goTo'), label: t('challengeSetup.palette.tour.label'), hint: t('challengeSetup.palette.tour.hint') },
  { id: 'support', group: t('palette.groups.goTo'), label: t('support.navigation.talkToSupport') },
];

const CommandPalette = dynamic(() => import('./palette-dialog').then((m) => m.CommandPalette), { ssr: false });

const inOtherDialog = (el: EventTarget | null) => el instanceof Element && !!el.closest('[role="dialog"]');

/**
 * G14 C1 ponto 22 (D-607): "Buscar ou comandar" (⌘K) é do app inteiro, não só do mapa. Um provider no shell guarda a paleta,
 * o atalho global e os comandos globais (ir para…, conta, tutorial, suporte); a tela atual soma os seus por `usePaletteCommands`.
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const flags=useQuestionFeatureFlags();const router = useRouter();
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false); // mount the (lazy) dialog on the first open and keep it, so closing still animates
  if (open && !used) setUsed(true);
  const [extra, setExtra] = useState<Extra | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !inOtherDialog(e.target)) { // works while typing too
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const items = useMemo(() => [...(extra?.items ?? []), ...GLOBAL.filter(c=>!c.id.startsWith('go:')||questionDestinationEnabled(routes[c.id.slice(3) as keyof typeof routes]??'',flags))], [extra,flags]);
  const onSelect = useCallback(
    (c: CommandItem) => {
      if (c.id === 'support') return openSupport('command');
      if (c.id === 'tour') return openChallengeTour();
      if (c.id.startsWith('go:')) return router.push(routes[c.id.slice(3) as keyof typeof routes] ?? '/app/hoje');
      extra?.run(c);
    },
    [extra, router],
  );
  const ctx = useMemo<Ctx>(() => ({ open: () => setOpen(true), setExtra }), []);
  return (
    <PaletteCtx.Provider value={ctx}>
      {children}
      {used ? <CommandPalette
        open={open}
        onOpenChange={setOpen}
        title={t('editor.commandPalette')}
        inputLabel={t('palette.placeholder')}
        placeholder={t('editor.searchLabel')}
        escText={t('palette.esc')}
        emptyText={t('palette.notFound')}
        items={items}
        onSelect={onSelect}
      /> : null}
    </PaletteCtx.Provider>
  );
}

const usePalette = () => useContext(PaletteCtx);

/** Adds the screen's commands to the global palette while it is mounted. `run` may change identity: the latest one is used. */
export function usePaletteCommands(items: readonly CommandItem[], run: (c: CommandItem) => void) {
  const p = usePalette();
  const runRef = useRef(run);
  runRef.current = run;
  const setExtra = p?.setExtra;
  useEffect(() => {
    if (!setExtra) return;
    setExtra({ items, run: (c) => runRef.current(c) });
  }, [setExtra, items]);
  useEffect(() => () => setExtra?.(null), [setExtra]);
}

/** Navbar trigger (desktop: label + ⌘K; phone header: icon only). */
export function PaletteButton({ compact = false }: { compact?: boolean }) {
  const p = usePalette();
  if (!p) return null;
  return compact ? (
    <IconButton variant="outline" aria-label={t('editor.commandPalette')} onClick={p.open} aria-keyshortcuts="Meta+K Control+K"><Icon name="search" size={20} /></IconButton>
  ) : (
    <Button size="sm" variant="secondary" icon={<Icon name="search" size={18} />} iconEnd={<Kbd>{t('palette.keyboardHint')}</Kbd>} onClick={p.open} aria-keyshortcuts="Meta+K Control+K">
      {t('editor.commandPalette')}
    </Button>
  );
}
