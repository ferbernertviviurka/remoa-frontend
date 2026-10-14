'use client';
import type {ReactNode} from 'react';
import Link from 'next/link';
import {withStrings} from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import {buttonVariants,focusRing} from '@remoa/ui';
import {useStudyProfile} from '@/features/study-profile/use-study-profile';
import {STUDY_EDIT_HREF} from '@/features/study-profile/destinations';

const t=withStrings({studyGate:more.studyGate});

/** F35 FR-26/28: the Enamed coverage follows showEnamed like the menu (no Enamed in Hoje for other profiles); the others are asked to define their focus. */
export function CoverageSlot({children}:{children:ReactNode}){
  const{capabilities}=useStudyProfile();
  if(capabilities.showEnamed)return<>{children}</>;
  return(
    <div className="flex flex-col items-start gap-2">
      <p className="m-0 font-bold">{t('studyGate.home.focusTitle')}</p>
      <p className="m-0 text-muted">{t('studyGate.home.focusBody')}</p>
      <Link href={STUDY_EDIT_HREF} className={`inline-flex min-h-11 items-center rounded-btn px-4 font-display text-sm no-underline ${buttonVariants.secondary} ${focusRing}`}>{t('studyGate.home.focusCta')}</Link>
    </div>
  );
}
