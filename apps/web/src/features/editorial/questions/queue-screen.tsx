'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import type { QuestionReviewDetail } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert,Button } from '@remoa/ui';
import { editorialQueue } from '@/features/admin/questions/api';
import { tq,adminQuestionError } from '@/features/admin/questions/labels';
import { AdminQuestionTitle } from '@/features/admin/questions/admin-shared';
import {useQuestionFeatureFlags} from '@/features/questions/flags';
import {QuestionCatalogBrowser} from '@/features/admin/questions/catalog-browser';
import { actionLink,panel } from '@/features/questions/shared';
function LegacyEditorialQueue(){const[items,setItems]=useState<QuestionReviewDetail[]|null>(null);const[error,setError]=useState<string|null>(null);const[retry,setRetry]=useState(0);useEffect(()=>{let active=true;void editorialQueue().then(v=>{if(active){setItems(v.items);setError(null);}}).catch(e=>{if(active)setError(adminQuestionError(e));});return()=>{active=false;};},[retry]);return <div className="space-y-6">{error?<Alert role="alert" tone="review" title={error}><Button onClick={()=>setRetry(n=>n+1)}>{t('common.retry')}</Button></Alert>:items===null?<p role="status">{t('common.loading')}</p>:items.length===0?<p>{tq('questionsAdmin.noEditorial')}</p>:items.map(q=><article className={`${panel} space-y-3`} key={q.id}><p className="whitespace-pre-wrap break-words">{q.stem}</p><p className="text-xs text-muted">{tq('questionsAdmin.publicVersion',{n:q.version})}</p><Link className={actionLink} href={`/app/editorial/questoes/${q.id}`}>{tq('questionsAdmin.editorialDetail')}</Link></article>)}</div>;}

export function QuestionEditorialQueue(){const flags=useQuestionFeatureFlags();return <div className="space-y-6"><AdminQuestionTitle title={tq('questionsAdmin.reviewerTitle')} description={tq('questionsAdmin.reviewerDescription')}/><Link className={actionLink} href="/app/editorial/questoes/relatos">{tq('questionsAdmin.reportsTitle')}</Link>{flags.catalog?<QuestionCatalogBrowser admin={false} initialStatus="in_review"/>:<LegacyEditorialQueue/>}</div>;}
