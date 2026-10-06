import { t } from '@remoa/strings/full';
import { SkeletonBlock as B, SkeletonRegion } from '@remoa/ui';

export default function Loading() {
  return (
    <SkeletonRegion label={t('referral.errors.loading')}>
      <div className="mx-auto flex w-full max-w-[1304px] flex-col gap-8 md:px-6 md:py-2">
        <B height={380} radius={38} />
        <div className="grid items-start gap-7 min-[1100px]:grid-cols-[minmax(0,1fr)_380px]"><B height={640} radius={34} /><B height={460} radius={34} /></div>
      </div>
    </SkeletonRegion>
  );
}
