'use client';

import { useRouter } from 'next/navigation';
import { completenessItems, computeCompleteness, type CompletenessItem } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Avatar, Icon } from '@remoa/ui';
import { CompletenessRing } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { usePhotoDialog } from '../profile/photo-dialog';
import { useAccount } from './account-context';
import { formatMonth, initialsOf } from './format';

const t = withStrings({ account: more.account });

const chip = 'rounded-pill bg-white/[.14] px-3 py-[5px] text-[13px] font-semibold text-on-dark-muted-2';
const todoChip =
  'lift flex h-11 items-center gap-2 rounded-pill bg-white pl-3 pr-4 md:h-10 text-sm font-bold text-panel-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

// Decoration of the mock (380 x 140, 60% opacity): 5 stars and 5 edges, copied from Conta.dc.html.
const edges: [number, number, number, number][] = [[112, 73, 91.2, -154], [112, 73, 103.8, -27.55], [204, 25, 131.2, 7.88], [112, 73, 164.1, 9.12], [274, 99, 82.1, -43.03]];
const stars: [number, number, number, string][] = [[22, 26, 16, '#FDBA74'], [100, 62, 24, '#C9BFFF'], [197, 19, 14, '#FCD34D'], [264, 90, 20, '#C9BFFF'], [328, 38, 12, '#7A6FB0']];
function Constellation() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute right-12 top-6 hidden h-[140px] w-[380px] opacity-60 md:block">
      {edges.map(([x, y, w, r]) => (
        <div key={`${x}-${y}-${r}`} className="absolute h-0.5 origin-left bg-white/20" style={{ left: x, top: y, width: w, transform: `rotate(${r}deg)` }} />
      ))}
      {stars.map(([x, y, d, c], i) => (
        <div key={x} className={`absolute rounded-full ${i === 0 ? 'pulsed' : ''}`} style={{ left: x, top: y, width: d, height: d, background: c }} />
      ))}
    </div>
  );
}

export function AccountHero() {
  const { account } = useAccount();
  const photo = usePhotoDialog();
  const router = useRouter();
  const { profile } = account;
  // Recomputed from the live context so optimistic edits move the ring without a reload (FR-3).
  const c = computeCompleteness(profile, account.preferences, { emailConfirmed: account.emailConfirmed, emailPending: !!account.pendingEmail });
  const name = profile.name?.trim() || null;

  function pick(item: CompletenessItem) {
    track('completeness_chip_clicked', { item });
    if (item === 'photo') return photo.open();
    if (item === 'reminder') return router.push('/app/conta/preferencias');
    const campo = { name: 'nome', goal: 'objetivo', email: 'email' }[item];
    router.push(`/app/conta/perfil?campo=${campo}`);
  }

  return (
    <section aria-label={t('account.hero.label')} className="relative flex flex-col gap-[22px] overflow-hidden rounded-hero bg-panel-dark p-5 text-on-dark md:px-8 md:py-7">
      <Constellation />
      <div className="relative flex flex-wrap items-center gap-x-7 gap-y-4">
        <button
          type="button"
          onClick={photo.open}
          aria-label={t('account.hero.avatarEdit')}
          className="relative rounded-pill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <CompletenessRing value={c.percent} label={t('account.hero.completenessLabel', { pct: c.percent })}>
            <Avatar name={name ?? t('account.hero.noName')} fallback={initialsOf(name, account.email)} src={account.avatarUrls?.large} size={108} color={profile.avatarColor} plain />
          </CompletenessRing>
          <span aria-hidden="true" className="absolute bottom-0.5 right-0.5 flex size-10 items-center justify-center rounded-pill bg-white text-primary-deep shadow-toast">
            <Icon name="camera" size={20} />
          </span>
        </button>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-[.12em] text-on-dark-muted">{t('account.title')}</span>
          <h1 className="m-0 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.035em] md:text-[42px]">{name ?? t('account.hero.noName')}</h1>
          <span className="text-[15px] text-on-dark-muted-2">{account.email}</span>
          <span className="mt-1.5 flex flex-wrap gap-2">
            <span className={chip}>{t('account.hero.plan', { plan: t(`billing.plan.${account.entitlements.plan}`) })}</span>
            <span className={chip}>{t('account.hero.joined', { month: formatMonth(account.joinedAt) })}</span>
            {account.streakDays != null && account.streakDays > 0 ? <span className={chip}>{t('account.hero.streak', { n: account.streakDays })}</span> : null}
          </span>
        </div>
      </div>
      <div className="relative flex flex-wrap items-center gap-3.5 rounded-[22px] bg-white/[.08] px-4 py-3">
        <span className="whitespace-nowrap font-display text-[17px] font-extrabold">{c.percent === 100 ? t('account.hero.complete') : t('account.hero.completeness', { pct: c.percent })}</span>
        <span aria-hidden="true" className="block h-2 w-[120px] overflow-hidden rounded bg-white/20">
          <span className="fillx block h-2 w-full rounded bg-white" style={{ transform: `scaleX(${c.percent / 100})`, transition: 'transform .9s cubic-bezier(.22,1,.36,1)' }} />
        </span>
        {c.percent === 100
          ? null
          : completenessItems.map((item) =>
              c.missing.includes(item) ? (
                <button key={item} type="button" onClick={() => pick(item)} className={todoChip}>
                  <Icon name="plus" size={16} />
                  {t(`account.hero.todo.${item}`)}
                </button>
              ) : (
                <span key={item} className="flex h-10 items-center gap-2 rounded-pill bg-white/[.14] pl-2.5 pr-3.5 text-sm font-semibold text-on-dark-muted-2">
                  <Icon name="check" size={16} />
                  {t(`account.hero.items.${item}`)}
                </span>
              ),
            )}
      </div>
    </section>
  );
}
