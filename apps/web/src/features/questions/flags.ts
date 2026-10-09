'use client';
import {useEffect,useState} from 'react';
import type {QuestionFeatureFlags} from '@remoa/contracts';
import {request} from './request';
export const disabledQuestionFeatures:QuestionFeatureFlags={import:false,catalog:false,sessions:false};
export async function readQuestionFeatureFlags(loadSchema:()=>Promise<typeof import('./flag-schema')>=()=>import('./flag-schema')):Promise<QuestionFeatureFlags>{try{const{questionFeatureFlagsSchema}=await loadSchema();return await request('/v1/question-features',questionFeatureFlagsSchema);}catch{return disabledQuestionFeatures;}}
/** Disabled until authenticated flags are read; failure never opens a rolled-out surface. */
export function useQuestionFeatureFlags(){const[flags,setFlags]=useState<QuestionFeatureFlags>(disabledQuestionFeatures);useEffect(()=>{let active=true;let revision=0;const read=()=>{const current=++revision;void readQuestionFeatureFlags().then(v=>{if(active&&current===revision)setFlags(v);});};read();window.addEventListener('focus',read);return()=>{active=false;window.removeEventListener('focus',read);};},[]);return flags;}
export const questionDestinationEnabled=(href:string,flags:QuestionFeatureFlags)=>!['/app/banco-de-questoes','/app/provas'].includes(href)||flags.catalog;
