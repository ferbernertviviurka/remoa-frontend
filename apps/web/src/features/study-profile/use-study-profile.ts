'use client';
import {useEffect,useState} from 'react';
import {profileCapabilities} from '@remoa/contracts';
import {getStudyProfile,type StudyProfileState} from './api';

/** Before the first read, and on any failure, the legacy capabilities: the menu never loses Enamed by a network error (D-1853). */
export const legacyStudyProfile:StudyProfileState={profile:null,capabilities:profileCapabilities(null)};
const EVENT='remoa:study-profile';
let shared:Promise<StudyProfileState>|null=null;

/** One request per page load for every consumer (rail, mobile menu, Hoje, Conta). */
export function readStudyProfile():Promise<StudyProfileState>{
  shared??=Promise.resolve().then(getStudyProfile).then(r=>r?.ok&&r.data?.capabilities?r.data:legacyStudyProfile).catch(()=>legacyStudyProfile);
  return shared;
}
/** FR-25: after a save, every mounted consumer updates at once without reloading. */
export function publishStudyProfile(state:StudyProfileState){shared=Promise.resolve(state);window.dispatchEvent(new CustomEvent<StudyProfileState>(EVENT,{detail:state}));}

export function useStudyProfile(){
  const[state,setState]=useState<StudyProfileState>(legacyStudyProfile);
  const[loaded,setLoaded]=useState(false);
  useEffect(()=>{
    let live=true;
    void readStudyProfile().then(s=>{if(live){setState(s);setLoaded(true);}});
    const on=(e:Event)=>setState((e as CustomEvent<StudyProfileState>).detail);
    window.addEventListener(EVENT,on);
    return()=>{live=false;window.removeEventListener(EVENT,on);};
  },[]);
  return{...state,loaded};
}
/** Tests only. */
export const resetStudyProfileCache=()=>{shared=null;};
