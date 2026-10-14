'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {withStrings} from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import {Alert,Button,buttonVariants,focusRing} from '@remoa/ui';
import {useStudyProfile} from './use-study-profile';
import {STUDY_EDIT_HREF} from './destinations';

const t=withStrings({studyGate:more.studyGate});
const KEY='remoa:confirm-study-dismissed';
const read=()=>{try{return sessionStorage.getItem(KEY)==='1';}catch{return false;}};

/** F35 FR-45/46: "Confirme o seu estudo" for migrated/no-row users. Dismiss lasts the session only; confirming (capabilities.needsConfirmation false) removes it. */
export function ConfirmBanner(){
  const{capabilities,loaded}=useStudyProfile();
  const[dismissed,setDismissed]=useState(true);
  useEffect(()=>setDismissed(read()),[]);
  if(!loaded||!capabilities.needsConfirmation||dismissed)return null;
  return(
    <Alert tone="brand" title={t('studyGate.confirm.title')}>
      <p className="m-0">{t('studyGate.confirm.body')}</p>
      <div className="flex flex-wrap gap-2">
        <Link href={STUDY_EDIT_HREF} className={`inline-flex min-h-11 items-center rounded-btn px-4 font-display text-sm no-underline ${buttonVariants.primary} ${focusRing}`}>{t('studyGate.confirm.cta')}</Link>
        <Button variant="quiet" onClick={()=>{try{sessionStorage.setItem(KEY,'1');}catch{/* private mode: dismiss for this view only */}setDismissed(true);}}>{t('studyGate.confirm.dismiss')}</Button>
      </div>
    </Alert>
  );
}
