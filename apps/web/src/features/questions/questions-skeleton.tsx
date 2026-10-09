'use client';
import { SkeletonBlock, SkeletonRegion } from '@remoa/ui';
import { t } from './labels';

/** Cards while the bank or the exam list is still loading. */
export function QuestionsSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <SkeletonRegion label={t('common.loading')}>
      <div className="flex flex-col gap-4">
        <SkeletonBlock height={48} radius={16} />
        {Array.from({ length: cards }, (_, i) => <SkeletonBlock key={i} height={168} radius={24} />)}
      </div>
    </SkeletonRegion>
  );
}
