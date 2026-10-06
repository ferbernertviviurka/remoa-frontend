import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { SkeletonBlock as B, SkeletonRegion } from '@remoa/ui';

const t = withStrings({ plans: more.plans });

/** F15 FR-12 loading: mirrors header, matrix card and order summary so nothing jumps when data arrives. */
export function PlansSkeleton() {
  return (
    <SkeletonRegion label={t('plans.states.loadingLabel')}>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 md:px-6 md:py-3">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-2"><B width={80} height={12} /><B width={560} height={48} radius={14} /><B width={420} height={18} /></div>
          <B width={320} height={58} radius={19} />
        </div>
        <div className="grid items-start gap-7 min-[1100px]:grid-cols-[minmax(0,1fr)_380px]">
          <B height={620} radius={26} />
          <B height={520} radius={26} />
        </div>
      </div>
    </SkeletonRegion>
  );
}
