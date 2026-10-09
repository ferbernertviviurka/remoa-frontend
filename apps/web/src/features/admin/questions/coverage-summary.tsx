'use client';
import { z } from 'zod';
import type { questionCatalogMetricsSchema } from '@remoa/contracts';
import { panel } from '@/features/questions/shared';
import { t } from '@/features/questions/labels';
import { tq } from './labels';
type Metrics=z.output<typeof questionCatalogMetricsSchema>;
export function CoverageSummary({metrics}:{metrics:Metrics}){
 const groups=[{title:tq('questionsAdmin.originCounts'),items:metrics.publicByOrigin.map(v=>({id:v.origin,name:t(`questions.source.${v.origin}`),count:v.count}))},{title:tq('questionsAdmin.areaCoverage'),items:metrics.coverageByArea.map(v=>({id:v.areaId,name:v.name,count:v.count}))},{title:tq('questionsAdmin.topicCoverage'),items:metrics.coverageByTopic.map(v=>({id:v.topicId,name:v.name,count:v.count}))}];
 return <section className={panel} aria-label={tq('questionsAdmin.coverageTitle')}><h2 className="font-display text-2xl font-bold">{tq('questionsAdmin.coverageTitle')}</h2><p className="my-3 text-sm text-muted">{tq('questionsAdmin.coverageDescription')}</p><div className="grid gap-5 md:grid-cols-3">{groups.map(group=><details key={group.title} open><summary className="min-h-11 cursor-pointer py-3 font-semibold">{group.title}</summary>{group.items.length?<ul className="max-h-80 space-y-2 overflow-y-auto">{group.items.map(item=><li key={item.id} className="flex min-w-0 justify-between gap-3"><span className="min-w-0 break-words">{item.name}</span><span className="shrink-0 font-bold tabular-nums">{item.count.toLocaleString('pt-BR')}</span></li>)}</ul>:<p className="text-sm text-muted">{tq('questionsAdmin.coverageEmpty')}</p>}</details>)}</div>{metrics.coverageTruncated?<p className="mt-4 text-sm text-muted">{tq('questionsAdmin.coverageLimited')}</p>:null}</section>;
}
