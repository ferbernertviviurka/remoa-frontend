import { t } from '@remoa/strings';
import { SkeletonBlock as B, SkeletonRegion } from '@remoa/ui';

export default function Loading() {
  return (
    <SkeletonRegion label={t('notifications.page.loading')}>
      <div className="mx-auto flex w-full max-w-[1304px] flex-col gap-6 md:px-6 md:py-2">
        <B height={64} radius={14} />
        <div className="grid items-start gap-7 min-[1100px]:grid-cols-[minmax(0,1fr)_420px]"><B height={640} radius={34} /><B height={640} radius={34} /></div>
      </div>
    </SkeletonRegion>
  );
}
