import { t } from '@remoa/strings';
import { SkeletonBlock, SkeletonRegion } from '@remoa/ui';

export default function Loading() {
  return (
    <SkeletonRegion label={t('coverage.loading')}>
      <div className="flex flex-col gap-4">
        <SkeletonBlock width={320} height={40} />
        <SkeletonBlock height={136} radius={28} />
        <SkeletonBlock height={140} radius={28} />
        <SkeletonBlock height={360} radius={28} />
      </div>
    </SkeletonRegion>
  );
}
