import Link from 'next/link';
import {withStrings} from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import {Empty,buttonVariants,focusRing} from '@remoa/ui';
import {STUDY_EDIT_HREF} from '@/features/study-profile/destinations';

const t=withStrings({studyGate:more.studyGate});

/** F35 FR-27: friendly notice (not an error, not a 404) for profiles without Enamed. */
export function CoverageGate(){
  return<Empty heading title={t('studyGate.gate.title')} description={t('studyGate.gate.body')} action={<Link href={STUDY_EDIT_HREF} className={`inline-flex min-h-11 items-center rounded-btn px-4 font-display text-sm no-underline ${buttonVariants.primary} ${focusRing}`}>{t('studyGate.gate.cta')}</Link>} />;
}
