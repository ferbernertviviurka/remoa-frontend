'use client';
import {useEffect,useState} from 'react';
import type {QuestionFeatureFlags} from '@remoa/contracts';
import {request} from './request';
import {disabledQuestionFeatures,questionFlagsPending} from './flag-state';
export {disabledQuestionFeatures,questionFlagsPending};
export async function readQuestionFeatureFlags(loadSchema:()=>Promise<typeof import('./flag-schema')>=()=>import('./flag-schema')):Promise<QuestionFeatureFlags>{try{const{questionFeatureFlagsSchema}=await loadSchema();return await request('/v1/question-features',questionFeatureFlagsSchema);}catch{return{...disabledQuestionFeatures};}}
/** One read per page load shared by rail, mobile menu, palette and map menu (was one each, plus one per focus). TTL covers focus refreshes and account switches. */
let shared:{at:number;done:boolean;read:Promise<QuestionFeatureFlags>}|null=null;
export const readSharedQuestionFeatureFlags=(fresh=false)=>{if(!shared||(fresh?shared.done:Date.now()-shared.at>30_000)){const entry={at:Date.now(),done:false,read:readQuestionFeatureFlags()};void entry.read.then(()=>{entry.done=true;});shared=entry;}return shared.read;};
export const resetSharedQuestionFeatureFlags=()=>{shared=null;};
/** Disabled until authenticated flags are read; failure never opens a rolled-out surface. */
export function useQuestionFeatureFlags(){const[flags,setFlags]=useState<QuestionFeatureFlags>(disabledQuestionFeatures);useEffect(()=>{let active=true;let revision=0;const read=(fresh=false)=>{const current=++revision;void readSharedQuestionFeatureFlags(fresh).then(v=>{if(active&&current===revision)setFlags(v);});};const onFocus=()=>read(true);read();window.addEventListener('focus',onFocus);return()=>{active=false;window.removeEventListener('focus',onFocus);};},[]);return flags;}
/** D-1838: Questões and Provas show only for accounts the API opens the student bank to (QUESTIONS_STUDENT_EMAILS). */
export const questionDestinationEnabled=(href:string,flags:QuestionFeatureFlags)=>!['/app/banco-de-questoes','/app/provas'].includes(href)||(flags.bankStudent&&flags.catalog);
