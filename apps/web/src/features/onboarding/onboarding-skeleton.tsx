import { t } from '@remoa/strings';
import { SkeletonBlock as B, SkeletonRegion } from '@remoa/ui';

/** Espelha o OnboardingView: logo centralizada, stepper abaixo, título, descrição, opções e botões (mesmas medidas, mobile e desktop). */
export function OnboardingSkeleton() {
  return (
    <SkeletonRegion label={t('common.loading')}>
      <div className="flex min-h-dvh flex-col bg-canvas">
        <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 pb-10 pt-5 sm:px-6 sm:pt-[30px] md:gap-7">
          <div className="flex flex-col items-center gap-4">
            <B width={132} height={32} radius={10} />
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <B width={110} height={40} radius={999} />
              <B width={40} height={40} radius={999} />
              <B width={40} height={40} radius={999} />
              <B width={40} height={40} radius={999} />
            </div>
          </div>
          <div className="flex flex-col gap-[22px]">
            <div className="flex flex-col gap-1.5">
              <B width="70%" height={36} radius={12} />
              <B width="90%" height={20} radius={8} />
            </div>
            <div className="flex flex-col gap-2.5">
              {[0, 1, 2, 3].map((i) => <B key={i} height={64} radius={18} />)}
            </div>
            <div className="flex gap-3"><B width={120} height={48} radius={14} /><B width={120} height={48} radius={14} /></div>
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
