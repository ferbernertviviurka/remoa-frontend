'use client';
import dynamic from 'next/dynamic';
import {t} from './labels';
/** The server selects this boundary only when catalogue rollout is disabled. Keep the F32 screen and SSR. */
const LegacyBankScreen=dynamic(()=>import('@/features/challenge-ai/bank-screen').then(module=>module.BankScreen),{ssr:true,loading:()=> <p role="status">{t('common.loading')}</p>});
export function LegacyQuestionBank(){return <LegacyBankScreen/>;}
