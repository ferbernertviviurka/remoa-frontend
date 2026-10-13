import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {idSchema} from '@remoa/contracts';
import {getQuestionFeatureFlags} from '@/features/questions/server-flags';
import {BuilderScreen} from '@/features/exam-builder/builder-screen';
import {presetIds,type PresetId} from '@/features/exam-builder/model';
import {t} from '@/features/exam-builder/labels';

export function generateMetadata(): Metadata {
  return {title: t('examBuilder.title')};
}

type SP={ids?:string;matrixItemIds?:string;source?:string;preset?:string};
const list=(v?:string)=>[...new Set((v??'').split(',').filter(x=>idSchema.safeParse(x).success))].slice(0,200);

// Flag closed: 404 before any new route is called (D-1821). The (app) layout already requires a session.
export default async function Page({searchParams}:{searchParams:Promise<SP>}){
  const flags=await getQuestionFeatureFlags();
  if(!flags.bankStudent)notFound();
  const sp=await searchParams;
  const preset=presetIds.find(p=>p===sp.preset) as PresetId|undefined;
  return <BuilderScreen init={{ids:list(sp.ids),matrixItemIds:list(sp.matrixItemIds),...(sp.source==='ai'?{source:'ai' as const}:{}),...(preset?{preset}:{})}}/>;
}
