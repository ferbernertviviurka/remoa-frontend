'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {QuestionAdminCatalogItem,QuestionAdminCatalogQuery,QuestionSource} from '@remoa/contracts';
import {Alert,Button,Empty,Input,Select,SkeletonBlock,SkeletonRegion,Tag} from '@remoa/ui';
import {t} from '@remoa/strings';
import {actionLink,panel} from '@/features/questions/shared';
import {listQuestionCatalog} from './catalog-api';
import {listSources} from './api';
import {adminQuestionError,tq} from './labels';
const statuses=['draft','in_review','approved','published','withdrawn','rejected'] as const;
const join=(previous:QuestionAdminCatalogItem[],next:QuestionAdminCatalogItem[])=>[...new Map([...previous,...next].map(item=>[item.id,item])).values()];
export function QuestionCatalogBrowser({admin,enabled=true,initialStatus}:{admin:boolean;enabled?:boolean;initialStatus?:QuestionAdminCatalogQuery['status']}){
 const[search,setSearch]=useState('');const[debouncedSearch,setDebouncedSearch]=useState('');const[status,setStatus]=useState(initialStatus??'all');const[type,setType]=useState('all');const[sourceId,setSourceId]=useState('all');const[versions,setVersions]=useState<'latest'|'all'>('latest');
 const[sources,setSources]=useState<QuestionSource[]>([]);const[sourceError,setSourceError]=useState<string|null>(null);const[sourceRetry,setSourceRetry]=useState(0);
 const[items,setItems]=useState<QuestionAdminCatalogItem[]>([]);const[cursor,setCursor]=useState<string|null>(null);const[loading,setLoading]=useState(false);const[more,setMore]=useState(false);const[error,setError]=useState<string|null>(null);const[retry,setRetry]=useState(0);
 const sequence=useRef(0);const controller=useRef<AbortController|null>(null);const heading=useRef<HTMLHeadingElement>(null);const pendingCursor=useRef<string|null>(null);
 useEffect(()=>{const timeout=setTimeout(()=>setDebouncedSearch(search.trim()),250);return()=>clearTimeout(timeout);},[search]);
 useEffect(()=>{setStatus(initialStatus??'all');setSourceId('all');},[admin,initialStatus]);
 useEffect(()=>{if(!admin||!enabled){setSources([]);setSourceError(null);return;}let current=true;setSourceError(null);void listSources().then(value=>{if(current)setSources(value.items);}).catch(reason=>{if(current)setSourceError(adminQuestionError(reason));});return()=>{current=false;};},[admin,enabled,sourceRetry]);
 const signature=JSON.stringify({admin,enabled,search:debouncedSearch,status,type,sourceId,versions});
 const query:Partial<QuestionAdminCatalogQuery>={limit:25,versions,...(debouncedSearch?{search:debouncedSearch}:{}),...(status!=='all'?{status:status as QuestionAdminCatalogQuery['status']}:{}),...(type!=='all'?{type:type as 'objective'|'discursive'}:{}),...(admin&&sourceId!=='all'?{sourceId}: {})};
 const queryRef=useRef(query);queryRef.current=query;
 useEffect(()=>{
  controller.current?.abort();pendingCursor.current=null;const generation=++sequence.current;setItems([]);setCursor(null);setError(null);setMore(false);
  if(!enabled){setLoading(false);return;}
  const abort=new AbortController();controller.current=abort;setLoading(true);
  void listQuestionCatalog(admin,queryRef.current,abort.signal).then(value=>{if(generation===sequence.current&&!abort.signal.aborted){setItems(value.items);setCursor(value.nextCursor);}}).catch(reason=>{if(generation===sequence.current&&!abort.signal.aborted)setError(adminQuestionError(reason));}).finally(()=>{if(generation===sequence.current&&!abort.signal.aborted)setLoading(false);});
  return()=>{controller.current?.abort();sequence.current=generation+1;};
 },[signature,retry,admin,enabled]);
 const loadMore=useCallback(async()=>{
  if(!cursor||loading||more||pendingCursor.current)return;const generation=sequence.current;const requestedCursor=cursor;const abort=new AbortController();controller.current=abort;pendingCursor.current=requestedCursor;setMore(true);setError(null);
  try{const value=await listQuestionCatalog(admin,{...queryRef.current,cursor:requestedCursor},abort.signal);if(generation!==sequence.current||abort.signal.aborted)return;setItems(previous=>join(previous,value.items));setCursor(value.nextCursor);}
  catch(reason){if(generation===sequence.current&&!abort.signal.aborted)setError(adminQuestionError(reason));}
  finally{if(generation===sequence.current&&!abort.signal.aborted){pendingCursor.current=null;setMore(false);}}
 },[admin,cursor,loading,more]);
 return <section aria-labelledby={admin?'admin-catalog-heading':'editorial-catalog-heading'} className="min-w-0 space-y-5">
  <h2 ref={heading} tabIndex={-1} id={admin?'admin-catalog-heading':'editorial-catalog-heading'} className="font-display text-2xl font-bold outline-none">{tq('questionsAdmin.catalogTitle')}</h2>
  {!enabled?<p>{tq('questionsAdmin.catalogDisabled')}</p>:<>
   <Input variant="search" label={tq('questionsAdmin.catalogSearch')} value={search} maxLength={200} onChange={event=>setSearch(event.target.value)}/>
   <div className="grid min-w-0 gap-4 md:grid-cols-2"><Select label={tq('questionsAdmin.catalogStatus')} value={status} onValueChange={setStatus} options={[{value:'all',label:tq('questionsAdmin.catalogAllStatuses')},...statuses.map(value=>({value,label:tq(`questionsAdmin.catalogStatuses.${value}`)}))]}/><Select label={tq('questionsAdmin.catalogVersions')} value={versions} onValueChange={value=>setVersions(value as typeof versions)} options={(['latest','all'] as const).map(value=>({value,label:tq(`questionsAdmin.versionScopes.${value}`)}))}/><Select label={tq('questionsAdmin.catalogType')} value={type} onValueChange={setType} options={[{value:'all',label:tq('questionsAdmin.catalogAllTypes')},{value:'objective',label:tq('questionsAdmin.catalogTypes.objective')},{value:'discursive',label:tq('questionsAdmin.catalogTypes.discursive')}]}/>{admin?<Select label={tq('questionsAdmin.source')} value={sourceId} onValueChange={setSourceId} options={[{value:'all',label:tq('questionsAdmin.catalogAllSources')},...sources.map(source=>({value:source.id,label:source.name}))]}/>:null}</div>
   <p className="text-sm text-muted">{tq(versions==='latest'?'questionsAdmin.catalogLatestHelp':'questionsAdmin.catalogAllHelp')}</p>
   {sourceError?<Alert tone="watch" role="alert" title={sourceError}><Button variant="secondary" onClick={()=>setSourceRetry(value=>value+1)}>{tq('questionsAdmin.catalogRetrySources')}</Button></Alert>:null}
   {loading?<SkeletonRegion label={t('common.loading')}><div className="flex flex-col gap-4"><SkeletonBlock height={120} radius={24} /><SkeletonBlock height={120} radius={24} /></div></SkeletonRegion>:items.length===0&&!error?<Empty title={tq('questionsAdmin.catalogEmpty')} />:items.map(item=><article key={item.id} className={`${panel} min-w-0 space-y-3`}>
    <div className="flex flex-wrap gap-2"><Tag>{tq('questionsAdmin.publicVersion',{n:item.version})}</Tag><Tag tone={item.catalogStatus==='published'?'steady':'unknown'}>{tq(`questionsAdmin.catalogStatuses.${item.catalogStatus}`)}</Tag><Tag tone="unknown">{tq(`questionsAdmin.catalogAvailability.${item.availability}`)}</Tag></div>
    <p className="whitespace-pre-wrap break-words">{item.stemPreview}</p><p className="break-words text-sm text-muted">{item.sourceLabel??tq('questionsAdmin.catalogUnknownSource')}</p><p className="text-sm text-muted">{tq('questionsAdmin.rights')}: {tq(`questionsAdmin.rightsLabels.${item.rightsStatus}`)}</p>
    <Link className={actionLink} href={`/app/editorial/questoes/${item.id}`}>{tq('questionsAdmin.editorialDetail')}</Link>
   </article>)}
   {error?<Alert tone="review" role="alert" title={error}><Button variant="secondary" onClick={()=>{if(items.length&&cursor)void loadMore();else setRetry(value=>value+1);}}>{t('common.retry')}</Button></Alert>:null}
   {cursor?<Button variant="secondary" loading={more} disabled={loading} onClick={()=>void loadMore()}>{tq('questionsAdmin.catalogMore')}</Button>:null}
  </>}
 </section>;
}
