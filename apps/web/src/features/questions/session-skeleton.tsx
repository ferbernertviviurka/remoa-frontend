'use client';
import { SkeletonBlock, SkeletonRegion } from '@remoa/ui';
import { t } from './labels';
import { panel } from './shared';

/** Shape of the resolution screen while the session loads: title, pills, favorite/doubt buttons, stem, alternatives, actions and navigator. */
export function SessionSkeleton() {
  return (
    <SkeletonRegion label={t('common.loading')}>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 py-2 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3"><SkeletonBlock width={160} height={12} /><SkeletonBlock width={340} height={40} radius={14} /><SkeletonBlock width={140} height={14} /></div>
          <div className="flex gap-3"><SkeletonBlock width={88} height={28} radius={8} /><SkeletonBlock width={128} height={48} radius={15} /></div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className={`${panel} flex min-w-0 flex-col gap-5`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2"><SkeletonBlock width={112} height={26} radius={999} /><SkeletonBlock width={96} height={26} radius={999} /><SkeletonBlock width={84} height={26} radius={999} /></div>
              <div className="flex gap-2"><SkeletonBlock width={44} height={44} radius={14} /><SkeletonBlock width={44} height={44} radius={14} /></div>
            </div>
            <div className="flex flex-col gap-3"><SkeletonBlock height={22} /><SkeletonBlock height={22} /><SkeletonBlock width="60%" height={22} /></div>
            <div className="flex flex-col gap-3">{Array.from({ length: 4 }, (_, i) => <SkeletonBlock key={i} height={58} radius={16} />)}</div>
            <div className="flex flex-wrap justify-between gap-3"><div className="flex gap-3"><SkeletonBlock width={96} height={44} radius={14} /><SkeletonBlock width={168} height={44} radius={14} /></div><SkeletonBlock width={164} height={48} radius={15} /></div>
          </div>
          <div className={`${panel} flex flex-col gap-4`}>
            <SkeletonBlock width={200} height={22} />
            <div className="grid grid-cols-5 gap-2">{Array.from({ length: 10 }, (_, i) => <SkeletonBlock key={i} height={44} radius={14} />)}</div>
            <SkeletonBlock height={48} radius={15} />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
