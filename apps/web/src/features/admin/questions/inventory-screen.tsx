'use client';
import Link from 'next/link';
import { useCallback,useEffect,useState } from 'react';
import type { z } from 'zod';
import type { questionCatalogMetricsSchema } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert,Button,SkeletonBlock,SkeletonRegion } from '@remoa/ui';
import {useQuestionFeatureFlags} from '@/features/questions/flags';
import { actionLink,panel } from '@/features/questions/shared';
import { catalogMetrics } from './api';
import {ImportsBrowser} from './imports-browser';
import {QuestionCatalogBrowser} from './catalog-browser';
import { CoverageSummary } from './coverage-summary';
import { AdminQuestionTabs,AdminQuestionTitle } from './admin-shared';
import { tq,adminQuestionError } from './labels';
type Metrics=z.output<typeof questionCatalogMetricsSchema>;
export function InventoryScreen(){const flags=useQuestionFeatureFlags();
  const[metrics,setMetrics]=useState<Metrics|null>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState<string|null>(null);
  const load=useCallback(async()=>{setLoading(true);setError(null);const results=await Promise.allSettled([catalogMetrics()]);if(results[0].status==='fulfilled')setMetrics(results[0].value);const failed=results.find(r=>r.status==='rejected');if(failed?.status==='rejected')setError(adminQuestionError(failed.reason));setLoading(false);},[]);useEffect(()=>{void load();},[load]);
  const pending=metrics?.candidateCounts.filter(c=>['pending','needs_review'].includes(c.state)).reduce((sum,c)=>sum+c.count,0)??0;
  return <div className="flex flex-col gap-6 p-5 md:p-9"><AdminQuestionTitle title={tq('questionsAdmin.title')} description={tq('questionsAdmin.description')}>{flags.import?<Link href="/admin/questoes/importar" className={actionLink}>{tq('questionsAdmin.importAction')}</Link>:null}</AdminQuestionTitle><AdminQuestionTabs/>{loading?<SkeletonRegion label={t('common.loading')}><div className="grid gap-5 lg:grid-cols-3"><SkeletonBlock height={148} radius={24} /><SkeletonBlock height={148} radius={24} /><SkeletonBlock height={148} radius={24} /></div></SkeletonRegion>:<><section className="grid gap-5 lg:grid-cols-3">{metrics?[{n:metrics.publicCanonical,title:tq('questionsAdmin.metricsTitle'),text:tq('questionsAdmin.metricsDescription')},{n:pending,title:tq('questionsAdmin.pendingTitle'),text:tq('questionsAdmin.confidence')},{n:metrics.generatedPrivate,title:tq('questionsAdmin.privateTitle'),text:tq('questionsAdmin.privateDescription')}].map(v=><article key={v.title} className={panel}><h2 className="text-sm font-bold text-muted">{v.title}</h2><p className="my-4 font-display text-[44px] font-extrabold">{v.n.toLocaleString('pt-BR')}</p><p className="text-sm text-muted">{v.text}</p></article>):null}</section>{metrics?<CoverageSummary metrics={metrics}/>:null}<Alert title={tq('questionsAdmin.goalTitle')}><p>{tq('questionsAdmin.goalDescription')}</p></Alert><ImportsBrowser compact enabled={flags.import}/></>}{error?<Alert role="alert" tone="review" title={error}><Button variant="secondary" onClick={()=>void load()}>{t('common.retry')}</Button></Alert>:null}<QuestionCatalogBrowser admin enabled={flags.catalog}/></div>;
}
export function ImportListScreen(){const flags=useQuestionFeatureFlags();return <div className="flex flex-col gap-6 p-5 md:p-9"><AdminQuestionTitle title={tq('questionsAdmin.jobsTitle')} description={tq('questionsAdmin.jobDescription')}>{flags.import?<Link className={actionLink} href="/admin/questoes/importar">{tq('questionsAdmin.importAction')}</Link>:null}</AdminQuestionTitle><AdminQuestionTabs/><ImportsBrowser enabled={flags.import}/></div>;}
