'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';

const t = withStrings({ studyProfile: more.studyProfile });

/** F35 FR-10: the wizard tells the (auth) side panel which course was picked; the panel lives in the shared layout. */
type Aside = { course: string; showEnamed: boolean } | null;
let current: Aside = null;
const subs = new Set<() => void>();
export function setSignupAside(a: Aside) {
  if (a?.course === current?.course && a?.showEnamed === current?.showEnamed) return;
  current = a;
  subs.forEach((f) => f());
}
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** Sign-in keeps the brand copy (props, from the server layout); /cadastro speaks to the course. */
export function AuthAsideCopy({ tagline, sub }: { tagline: string; sub: string }) {
  const a = useSyncExternalStore(subscribe, () => current, () => null);
  if (usePathname() !== '/cadastro') {
    return (
      <div className="flex max-w-[420px] flex-col gap-3">
        <p className="m-0 font-display text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em]">{tagline}</p>
        <p className="m-0 text-base leading-normal text-on-dark-muted-2">{sub}</p>
      </div>
    );
  }
  const benefits = [t('studyProfile.signup.aside.b1'), t('studyProfile.signup.aside.b2'), t(a?.showEnamed ? 'studyProfile.signup.aside.enamed' : a ? 'studyProfile.signup.aside.course' : 'studyProfile.signup.aside.other')];
  return (
    <div className="flex max-w-[440px] flex-col gap-3">
      <span className="text-xs font-extrabold tracking-[.12em] text-on-dark-muted">{t('studyProfile.signup.aside.tag')}</span>
      <p aria-live="polite" className="m-0 font-display text-[36px] font-extrabold leading-[1.08] tracking-[-0.03em]">
        {a ? t('studyProfile.signup.aside.titleCourse', { course: a.course }) : t('studyProfile.signup.aside.title')}
      </p>
      <p className="m-0 text-base leading-normal text-on-dark-muted-2">{t(a ? 'studyProfile.signup.aside.subCourse' : 'studyProfile.signup.aside.sub')}</p>
      <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[15px] text-on-dark-muted-2">
        {benefits.map((b) => <li key={b}>{b}</li>)}
      </ul>
    </div>
  );
}
