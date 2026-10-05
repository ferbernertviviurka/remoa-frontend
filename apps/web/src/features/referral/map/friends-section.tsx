'use client';

import { useState } from 'react';
import type { ReferralFriend } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { SkeletonBlock, SkeletonRegion } from '@remoa/ui';
import { FriendDetail, FriendList, FriendRow, ReferralLegend, ReferralMap } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { countBy, friendName, friendWhen, shortDate, statusLabel, toMapFriends } from '../format';

const detailText = (f: ReferralFriend) =>
  f.status === 'qualified'
    ? t('referral.friends.detail.qualified', { when: shortDate(f.steps.qualifiedAt ?? f.when) })
    : t(f.status === 'signed_up' ? 'referral.friends.detail.pendingSignedUp' : 'referral.friends.detail.pendingInvited');

/**
 * FR-10/FR-11: mapa (só com 760 px ou mais de largura útil (o palco de 800 px perde até 20 px de cada lado, sem cortar nós), P-181) e lista equivalente compartilham a seleção; abaixo disso só a lista.
 * A lista é a representação principal (o mapa é `aria-hidden`). Sem amigos: 3 nós "Convidar" no mapa e o texto de vazio na lista.
 */
export function FriendsSection({ friends, loading }: { friends: ReadonlyArray<ReferralFriend>; loading?: boolean }) {
  const [picked, setPicked] = useState<string>();
  const selected = friends.find((f) => f.id === picked) ?? friends.find((f) => f.status !== 'qualified') ?? friends[0];
  const select = (id: string) => {
    setPicked(id);
    const f = friends.find((x) => x.id === id);
    if (f) track('referral_friend_selected', { status: f.status });
  };
  const legend = ([['qualified', 'qualified'], ['signed_up', 'signedUp'], ['invited', 'invited']] as const).map(([status, key]) => ({
    status,
    label: t('referral.page.legendItem', { n: countBy(friends, status), label: t(`referral.map.legend.${key}`) }),
  }));
  const loadingLabel = loading ? t('referral.errors.loading') : undefined;

  return (
    <section aria-labelledby="t-mapa" className="flex flex-col gap-6 rounded-[40px] border border-border bg-surface p-5 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{t('referral.map.label')}</span>
          <h2 id="t-mapa" className="m-0 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.035em] md:text-[40px]">{t('referral.map.title')}</h2>
        </div>
        {loading ? null : <ReferralLegend items={legend} />}
      </div>
      <div className="grid items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_380px]">
        <div className="@container">
          <div className="hidden @[760px]:block">
            <ReferralMap
              friends={toMapFriends(friends)}
              selectedId={selected?.id}
              onSelect={select}
              youLabel={t('referral.map.youLabel')}
              badgeLabel={t('referral.page.badge')}
              inviteLabel={t('referral.map.inviteLabel')}
              loadingLabel={loadingLabel}
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3.5">
          {loading ? (
            <SkeletonRegion label={t('referral.errors.loading')}><div className="flex flex-col gap-1.5"><SkeletonBlock height={56} radius={16} /><SkeletonBlock height={56} radius={16} /></div></SkeletonRegion>
          ) : (
            <FriendList aria-label={t('referral.friends.label')} emptyText={t('referral.friends.noFriends')}>
              {friends.map((f) => (
                <FriendRow key={f.id} name={friendName(f)} when={friendWhen(f)} status={f.status} statusLabel={statusLabel(f.status)} selected={f.id === selected?.id} onSelect={() => select(f.id)} />
              ))}
            </FriendList>
          )}
          {selected && !loading ? (
            <FriendDetail
              key={selected.id}
              name={friendName(selected)}
              status={selected.status}
              statusLabel={statusLabel(selected.status)}
              doneLabel={t('referral.page.done')}
              steps={[
                { id: 'invited', label: t('referral.friends.detail.step1'), done: true },
                { id: 'signed_up', label: t('referral.friends.detail.step2'), done: selected.status !== 'invited' },
                { id: 'qualified', label: t('referral.friends.detail.step3'), done: selected.status === 'qualified' },
              ]}
              text={detailText(selected)}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
