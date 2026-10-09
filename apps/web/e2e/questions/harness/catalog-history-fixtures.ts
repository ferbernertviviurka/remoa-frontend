/** CCR139 dedicated strict synthetic HTTP; role paths are simulated, never actual auth/SQL. */
import {
 questionAdminCatalogQuerySchema,questionAdminCatalogPageSchema,questionAdminCatalogResultSchema,
 questionHistoryQuerySchema,questionVersionHistoryPageSchema,questionVersionHistoryResultSchema,
 questionReviewHistoryPageSchema,questionReviewHistoryResultSchema,questionEditorialDetailSchema,
 questionEditorialQueueSchema,questionSourceListSchema,questionSourceSchema,questionCatalogMetricsSchema,
 questionImportListSchema,questionFeatureFlagsSchema,
} from '@remoa/contracts';
import type {QuestionAdminCatalogItem,QuestionReviewHistoryItem} from '@remoa/contracts';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const timestamp='2026-10-01T12:00:00.000Z';
const audit={id:2,createdAt:timestamp,actorType:'admin',actor:null,action:'question.catalog_view',targetType:'question',targetId:id(1201),targetLabel:null,reason:'Consulta sintética não clínica',result:'success',denial:null,before:null,after:null,ipHash:null,userAgent:null,requestId:null};
const sources=[210,211].map(n=>questionSourceSchema.parse({id:id(n),name:n===210?'Fonte autoral Aurora':'Fonte autoral Horizonte',publisher:'Harness Remoa',url:'https://example.org/synthetic-'+n,rightsStatus:'authorized',rightsEvidence:'Permissão fictícia exclusiva da fixture',rightsScope:'Teste não clínico',rightsExpiresAt:null,accessedAt:timestamp,documentVersion:'1',createdAt:timestamp,updatedAt:timestamp}));
const statuses=['approved','published','withdrawn','in_review','draft','rejected'] as const;
function item(n:number):QuestionAdminCatalogItem{return questionAdminCatalogPageSchema.parse({items:[{id:id(n),canonicalId:id(n),supersedesId:null,version:1,type:n%3===0?'discursive':'objective',origin:'remoa_authored',stemPreview:`Registro autoral sintético ${n-1000}: navegação e comparação de metadados.`,catalogStatus:statuses[n%statuses.length],rightsStatus:'authorized',availability:n%statuses.length===2?'unavailable':'active',sourceId:sources[n%2]!.id,sourceLabel:sources[n%2]!.name,contentHash:'a'.repeat(64),reviewedHash:null,createdAt:timestamp,updatedAt:timestamp,publishedAt:n%statuses.length===1?timestamp:null}],nextCursor:null}).items[0]!;}
const previous={...item(1200),canonicalId:id(1200),version:1,type:'objective' as const,catalogStatus:'published' as const,publishedAt:new Date(timestamp),contentHash:'c'.repeat(64),reviewedHash:'c'.repeat(64),stemPreview:'Publicação anterior da família autoral'};
const latest={...item(1201),canonicalId:id(1200),supersedesId:previous.id,version:2,type:'objective' as const,catalogStatus:'draft' as const,publishedAt:null,contentHash:'d'.repeat(64),reviewedHash:null,stemPreview:'Versão nova em rascunho da família autoral'};
const records=[latest,...Array.from({length:65},(_,index)=>item(1000+index)),previous];
let state:{scenario:string;catalogCalls:number}|null=null;
export const resetCatalogHistoryScenario=(scenario:string)=>{state=scenario.startsWith('catalog-')?{scenario,catalogCalls:0}:null;};
type Ok=(data:unknown)=>void;type Fail=(code:string,status?:number,message?:string)=>void;
const toRaw=(url:URL)=>Object.fromEntries(url.searchParams);
const page=(items:unknown[],limit:number,cursor:string|undefined,binding:string)=>{
 let offset=0;if(cursor){const decoded=JSON.parse(Buffer.from(cursor,'base64url').toString()) as {offset?:unknown;binding?:unknown};if(decoded.binding!==binding||typeof decoded.offset!=='number'||!Number.isInteger(decoded.offset)||decoded.offset<0)throw new Error('cursor_scope');offset=decoded.offset;}
 return{items:items.slice(offset,offset+limit),nextCursor:offset+limit<items.length?Buffer.from(JSON.stringify({offset:offset+limit,binding})).toString('base64url'):null};
};
function detail(record:QuestionAdminCatalogItem){return questionEditorialDetailSchema.parse({question:{id:record.id,canonicalId:record.canonicalId,version:record.version,type:record.type,difficulty:'medium',stem:record.stemPreview,alternatives:record.type==='objective'?[{key:'A',text:'Opção autoral um'},{key:'B',text:'Opção autoral dois'}]:null,correctKey:record.type==='objective'?'A':null,explanation:'Comentário sintético não clínico autorizado apenas no detalhe.',areaId:id(300),topicId:id(301),origin:record.origin,sourceId:record.sourceId,catalogStatus:record.catalogStatus,rightsStatus:record.rightsStatus,availability:record.availability,integrityConfirmed:true,keyFinal:true,enamedConfirmed:true,contentHash:record.contentHash,reviewedHash:record.reviewedHash,reviewerName:'Revisor sintético',reviewerCrm:'12345-SP',referenceDate:'2026-01-01',assets:[],contextManaged:false,ownStem:null,contextBindings:[]},source:sources.find(source=>source.id===record.sourceId)??null,latestReview:record.reviewedHash?{decision:'approved',contentHash:record.reviewedHash,reviewerName:'Revisor sintético',reviewerCrm:'12345-SP',referenceDate:'2026-01-01',reviewedAt:timestamp}:null});}
export function catalogHistoryRoute(path:string,method:string,url:URL,ok:Ok,fail:Fail):boolean{
 if(!state)return false;const current=state;
 if(method!=='GET'&&path.startsWith('/v1/')){fail('not_found',404,'readonly_synthetic_fixture');return true;}
 if(path==='/v1/question-features'){ok(questionFeatureFlagsSchema.parse({import:true,catalog:current.scenario!=='catalog-flagoff',sessions:true}));return true;}
 if(path==='/v1/admin/questions/sources'){ok(questionSourceListSchema.parse({items:sources,audit}));return true;}
 if(path==='/v1/admin/questions/imports'){ok(questionImportListSchema.parse({items:[],audit}));return true;}
 if(path==='/v1/admin/questions/metrics'){ok(questionCatalogMetricsSchema.parse({publicCanonical:20,importsByStatus:[],candidateCounts:[],documents:0,generatedPrivate:0,duplicateOrVersionNotCounted:true,publicByOrigin:[{origin:'remoa_authored',count:20}],coverageByArea:[],coverageByTopic:[],coverageTruncated:false,audit}));return true;}
 if(path==='/v1/editorial/questions'){ok(questionEditorialQueueSchema.parse({items:[detail(item(1000)).question]}));return true;}
 const catalog=path.match(/^\/v1\/(admin|editorial)\/questions\/catalog$/);
 const history=path.match(/^\/v1\/(admin|editorial)\/questions\/([^/]+)\/(history|reviews)$/);
 if(catalog||history){
  if(current.scenario==='catalog-flagoff'){fail('not_found',404,'question_catalog_disabled');return true;}
  if(catalog){current.catalogCalls++;if(current.scenario==='catalog-error'&&current.catalogCalls===1){fail('internal',503,'synthetic_catalog_unavailable');return true;}
   const input=questionAdminCatalogQuerySchema.safeParse(toRaw(url));if(!input.success){fail('validation',422);return true;}const q=input.data;const filtered=records.filter(record=>(q.versions==='all'||record.id!==previous.id)&&(!q.status||record.catalogStatus===q.status)&&(!q.type||record.type===q.type)&&(!q.sourceId||record.sourceId===q.sourceId)&&(!q.search||record.stemPreview.toLocaleLowerCase().includes(q.search.toLocaleLowerCase())));
   try{const value=page(filtered,q.limit,q.cursor,JSON.stringify({scope:catalog[1],...q,cursor:undefined}));ok(catalog[1]==='admin'?questionAdminCatalogResultSchema.parse({...value,audit}):questionAdminCatalogPageSchema.parse(value));}catch{fail('conflict',409,'cursor_scope_changed');}return true;
  }
  const qid=history![2]!,record=records.find(value=>value.id===qid);if(!record){fail('not_found',404);return true;}const input=questionHistoryQuerySchema.safeParse(toRaw(url));if(!input.success){fail('validation',422);return true;}const q=input.data;const kind=history![3],admin=history![1]==='admin';
  const responseId=current.scenario==='catalog-history-mismatch'?id(9999):qid;
  try{const binding=JSON.stringify({scope:history![1],qid,kind,limit:q.limit});
   if(kind==='history'){const value={questionId:responseId,canonicalId:record.canonicalId,...page(records.filter(value=>value.canonicalId===record.canonicalId),q.limit,q.cursor,binding)};ok(admin?questionVersionHistoryResultSchema.parse({...value,audit:{...audit,action:'question.history_view'}}):questionVersionHistoryPageSchema.parse(value));}
   else{const signatures:QuestionReviewHistoryItem[]=Array.from({length:31},(_,index)=>({id:id(5000+index),questionId:qid,decision:index%2===0?'approved':'changes_requested',contentHash:record.contentHash!,reason:`Conferência sintética da versão ${record.version}, assinatura ${index+1}`,reviewerName:`Revisor sintético da versão ${record.version}`,reviewerCrm:'12345-SP',referenceDate:'2026-01-01',reviewedAt:new Date(timestamp)}));const value={questionId:responseId,...page(signatures,q.limit,q.cursor,binding)};ok(admin?questionReviewHistoryResultSchema.parse({...value,audit:{...audit,action:'question.history_view'}}):questionReviewHistoryPageSchema.parse(value));}
  }catch{fail('conflict',409,'cursor_scope_changed');}return true;
 }
 const selected=path.match(/^\/v1\/editorial\/questions\/([^/]+)$/);if(selected){const record=records.find(value=>value.id===selected[1]);if(record)ok(detail(record));else fail('not_found',404);return true;}
 if(path.startsWith('/v1/')){fail('not_found',404,'dedicated_catalog_fixture');return true;}return false;
}
