'use client';

import { useState } from 'react';
import { useNavigate } from '@/features/shell/use-navigate';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button, Dialog, Icon } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { useEntitlements } from '@/features/shell/entitlements';
import { atBoardLimit } from './slides';

const t = withStrings({ home: more.home });

/** Importar (diálogo "Em breve", D-068) e Novo mapa no topo do Hoje. */
export function HomeHeaderActions({ mapCount }: { mapCount: number }) {
  const [navigating, router] = useNavigate();
  const { entitlements } = useEntitlements();
  const locked = atBoardLimit(mapCount, entitlements);
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" icon={<Icon name="upload" size={20} />} onClick={() => setOpen(true)}>
        {t('shell.header.import')}
      </Button>
      <Button
        variant={locked ? 'secondary' : 'primary'}
        loading={navigating}
        loadingLabel={t('common.loading')}
        icon={locked ? <Icon name="lock" size={20} /> : <Icon name="plus" size={20} />}
        onClick={() => {
          if (locked) track('upgrade_clicked', { source: 'header_new_map_lock' });
          router.push(locked ? '/app/planos?de=header_new_map_lock' : '/app/mapas/novo');
        }}
      >
        {t('library.newMapButton')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title={t('shell.header.importTitle')} description={t('shell.header.importBody')} closeLabel={t('common.close')} />
    </div>
  );
}

/** Botões do Hero. `only` = mapa com mais vencidos (aparece quando há mais de um mapa vencendo). */
export function HeroActions({ only }: { only?: { id: string; title: string } }) {
  const [navigating, router] = useNavigate();
  return (
    <>
      <Button variant="light" size="hero" loading={navigating} loadingLabel={t('common.loading')} iconEnd={<Icon name="right" size={20} />} onClick={() => router.push('/app/revisar')}>
        {t('home.startReview')}
      </Button>
      {only ? (
        <Button variant="outline-light" size="hero" disabled={navigating} onClick={() => router.push(`/app/mapas/${only.id}?modo=desafio`)}>
          {t('home.reviewOnlyBoard', { board: only.title })}
        </Button>
      ) : null}
    </>
  );
}

export function GoButton({ href, label, variant }: { href: string; label: string; variant?: 'light' | 'primary' }) {
  const [navigating, router] = useNavigate();
  return (
    <Button variant={variant ?? 'primary'} size={variant === 'light' ? 'hero' : 'md'} loading={navigating} loadingLabel={t('common.loading')} onClick={() => router.push(href)}>
      {label}
    </Button>
  );
}
