/** Dedicated nonmedical CCR138/140 HTTP fixtures; no SQL, auth, storage or providers. */
import {
 questionSessionPublicSchema,questionSessionReportSchema,questionSessionRecalculationSchema,
 questionEditorialDetailSchema,questionPublishInputSchema,questionPublicationResultSchema,
 questionSourceSchema,enamedTopicOptionSchema,questionFeatureFlagsSchema,
} from '@remoa/contracts';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const now=()=>new Date().toISOString();const hash='c'.repeat(64);
const longStem=('Documento autoral sintético de engenharia. '+ 'leitura '.repeat(2800)).slice(0,19970)+' NÃO se aplica.';
const longAlternative='Alternativa sintética '+ 'https://example.org/'+ 'x'.repeat(200);
const audit={id:1,createdAt:now(),actorType:'admin',actor:null,action:'question.publish',targetType:'question',targetId:id(401),targetLabel:null,reason:'Conferência sintética',result:'success',denial:null,before:null,after:null,ipHash:null,userAgent:null,requestId:null};
function make(scenario:string,origin:string){
 const source=questionSourceSchema.parse({id:id(302),name:'Fonte autoral da revisão final',publisher:'Harness Remoa',url:'https://example.org/authorial',rightsStatus:scenario==='result-review-annulled-no-rights'?'revoked':'authorized',rightsEvidence:'Autorização fictícia somente para esta fixture',rightsScope:'Teste sintético não clínico',rightsExpiresAt:null,accessedAt:now(),documentVersion:'1',createdAt:now(),updatedAt:now()});
 const question=(n:number)=>({id:id(n),canonicalId:id(n),version:1,type:'objective',stem:n===1?longStem:`Questão autoral sintética ${n}`,alternatives:[{key:'A',text:'Alternativa autoral um'},{key:'B',text:n===1?longAlternative:'Alternativa autoral dois'}],origin:'remoa_authored',visibility:'public',availability:n===4?'annulled':'active',difficulty:'medium',topicId:n===3?null:n===5?id(399):id(301),areaId:n===3?null:n===5?id(398):id(300),sourceId:source.id,sourceLabel:source.name,reviewed:true,assets:n===1?[{id:id(380),alt:'Figura autoral: dois círculos roxos de tamanhos distintos',url:origin+'/diagram.svg',provenance:null}]:[],boardId:null,cardIds:[],createdAt:now()});
 const session=questionSessionPublicSchema.parse({id:id(310),mode:'simulation',status:scenario==='result-review-active'?'active':'finished',revision:4,startedAt:now(),deadline:scenario==='result-review-active'?new Date(Date.now()+1800000).toISOString():null,finishedAt:scenario==='result-review-active'?null:now(),serverTime:now(),items:[1,2,3,4,5].map((n,position)=>({id:id(320+n),position,question:question(n),originalNumber:String(10+n),selectedKey:scenario==='result-review-active'||n===2||n===3?null:n===1?'B':'A',answered:scenario!=='result-review-active'&&n!==3,doubtful:false,revision:scenario==='result-review-active'||n===3?0:1}))});
 const reference=(n:number)=>({questionId:id(n),version:1,correctKey:n===4?null:'A',explanation:`Comentário autoral sintético ${n}`,distractorNotes:n===1?{B:'Comentário revisado da alternativa sintética B'}:null,annulled:n===4,reviewed:true,reviewerName:'Revisor sintético',reviewerCrm:'12345-SP',referenceDate:'2026-01-01',sourceUrl:'https://example.org/authorial',obsolete:n===1});
 const results=['incorrect','incorrect','unanswered','annulled','correct'];
 const report=questionSessionReportSchema.parse({sessionId:session.id,version:1,correct:1,incorrect:2,unanswered:1,annulled:1,denominator:4,score:.25,items:session.items.map((item,index)=>({itemId:item.id,result:results[index],reference:reference(index+1)}))});
 const comparison=questionSessionRecalculationSchema.parse({sessionId:session.id,originalVersion:1,calculatedAt:now(),complete:false,aggregates:null,items:session.items.map((item,index)=>({itemId:item.id,originalQuestionId:item.question.id,originalQuestionVersion:1,comparedQuestionId:index===0?id(101):item.question.id,comparedQuestionVersion:index===0?2:1,outcome:index===0?'not_comparable':results[index],reasonCode:index===0?'content_not_comparable':index===3?'annulled':'unchanged',reference:index===0?null:reference(index+1)}))});
 const clinical=questionEditorialDetailSchema.parse({question:{contextManaged:false,ownStem:null,contextBindings:[],id:id(401),canonicalId:id(401),version:2,type:'objective',difficulty:'medium',stem:'Anulada autoral de teste: nenhum conteúdo clínico.',alternatives:[{key:'A',text:'Opção sintética um'},{key:'B',text:'Opção sintética dois'}],correctKey:null,explanation:'Comentário autoral conferido para a fixture anulada.',areaId:id(300),topicId:id(301),origin:'remoa_authored',sourceId:source.id,catalogStatus:scenario==='result-review-annulled-withdrawn'?'withdrawn':'approved',rightsStatus:source.rightsStatus,availability:scenario==='result-review-annulled-unavailable'?'unavailable':'annulled',integrityConfirmed:true,keyFinal:true,enamedConfirmed:true,contentHash:hash,reviewedHash:scenario==='result-review-annulled-no-review'?null:hash,reviewerName:'Revisor sintético',reviewerCrm:'12345-SP',referenceDate:'2026-01-01',assets:[]},source:scenario==='result-review-annulled-no-source'?null:source,latestReview:scenario==='result-review-annulled-no-review'?null:{decision:'approved',contentHash:hash,reviewerName:'Revisor sintético',reviewerCrm:'12345-SP',referenceDate:'2026-01-01',reviewedAt:now()}});
 return{scenario,session,report,comparison,clinical,taxonomyCalls:0};
}
let state:ReturnType<typeof make>|null=null;
export function resetResultReviewScenario(scenario:string,origin:string){state=scenario.startsWith('result-review-')?make(scenario,origin):null;}
type Ok=(data:unknown)=>void;type Fail=(code:string,status?:number,message?:string)=>void;
export function resultReviewRoute(path:string,method:string,url:URL,body:unknown,ok:Ok,fail:Fail):boolean{
 if(!state)return false;const current=state;
 if(path==='/v1/question-features'){ok(questionFeatureFlagsSchema.parse({import:true,catalog:true,sessions:true}));return true;}
 if(path==='/v1/challenge-ai/taxonomy'){
  current.taxonomyCalls++;
  if(current.scenario==='result-review-taxonomy-error'&&current.taxonomyCalls===1){fail('internal',503,'synthetic_taxonomy_failure');return true;}
  const kind=url.searchParams.get('kind');const values=current.scenario==='result-review-taxonomy-unknown'?[]:[{id:kind==='area'?id(300):id(301),name:kind==='area'?'Área autoral demonstrativa':'Assunto autoral demonstrativo'}];ok(values.map(value=>enamedTopicOptionSchema.parse(value)));return true;
 }
 if(path===`/v1/question-sessions/${current.session.id}`&&method==='GET'){ok(questionSessionPublicSchema.parse({...current.session,serverTime:now()}));return true;}
 if(path===`/v1/question-sessions/${current.session.id}/report`&&method==='GET'){
  if(current.session.status==='active')fail('forbidden',403,'reference_locked');else ok(questionSessionReportSchema.parse(current.report));return true;
 }
 if(path===`/v1/question-sessions/${current.session.id}/recalculation`&&method==='GET'){
  if(current.session.status==='active')fail('conflict',409,'reference_not_available');else ok(questionSessionRecalculationSchema.parse(current.comparison));return true;
 }
 if(path.startsWith(`/v1/question-sessions/${current.session.id}/items/`)&&path.endsWith('/reference')){fail('forbidden',403,'reference_locked');return true;}
 if(path===`/v1/editorial/questions/${current.clinical.question.id}`&&method==='GET'){ok(questionEditorialDetailSchema.parse(current.clinical));return true;}
 if(path===`/v1/admin/questions/${current.clinical.question.id}/publish`&&method==='POST'){
  const input=questionPublishInputSchema.safeParse(body);if(!input.success){fail('validation',422);return true;}
  const detail=current.clinical,q=detail.question;
  if(input.data.expectedContentHash!==q.contentHash||input.data.revision!==q.version){fail('conflict',409,'question_revision_changed');return true;}
  if(q.catalogStatus==='withdrawn'||q.availability!=='annulled'||!q.integrityConfirmed||!q.keyFinal||!q.enamedConfirmed||!q.areaId||!q.topicId||!q.explanation||q.rightsStatus!=='authorized'||detail.source?.rightsStatus!=='authorized'||!detail.latestReview||detail.latestReview.decision!=='approved'||detail.latestReview.contentHash!==q.contentHash||q.reviewedHash!==q.contentHash){fail('conflict',409,'publication_gate');return true;}
  q.catalogStatus='published';ok(questionPublicationResultSchema.parse({id:q.id,status:'published',audit:{...audit,reason:input.data.reason}}));return true;
 }
 // Dedicated scenario never falls through to the permissive legacy fixtures.
 if(path.startsWith('/v1/')){fail('not_found',404,'dedicated_readonly_fixture');return true;}
 return false;
}
