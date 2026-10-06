import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { SkeletonBlock as B, SkeletonRegion } from '@remoa/ui';

const t = withStrings({ account: more.account });

export default function Loading() {
  return (
    <SkeletonRegion label={t('account.skeletonLabel')}>
      <div className="flex flex-col gap-6">
        <B height={300} radius={28} />
        <B height={220} radius={28} />
      </div>
    </SkeletonRegion>
  );
}
